import os
import io
import base64
from typing import Dict, Any

import torch
import torch.nn as nn
import torchvision
from torchvision import transforms
import torch.nn.functional as F
import numpy as np
from PIL import Image

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


class Encoder(nn.Module):
    """
    The encoder part of the U-Net, built from a pretrained ShuffleNetV2.
    It captures features at multiple scales for the skip connections.
    """
    def __init__(self, original_model):
        super().__init__()
        # We take layers directly from the pretrained ShuffleNetV2
        self.conv1 = original_model.conv1
        self.maxpool = original_model.maxpool
        self.stage2 = original_model.stage2
        self.stage3 = original_model.stage3
        self.stage4 = original_model.stage4
        self.conv5 = original_model.conv5

    def forward(self, x):
        # Input: [N, 3, 64, 64]
        s0 = x
        x = self.conv1(x)    # -> [N, 24, 32, 32]
        s1 = x
        x = self.maxpool(x)  # -> [N, 24, 16, 16]
        s2 = x
        x = self.stage2(x)   # -> [N, 116, 8, 8]
        s3 = x
        x = self.stage3(x)   # -> [N, 232, 4, 4]
        s4 = x
        x = self.stage4(x)   # -> [N, 464, 2, 2]

        # The bottleneck is the final feature map before the fully connected layers
        bottleneck = self.conv5(x) # -> [N, 1024, 2, 2]

        # Return the bottleneck and the skip connections in order from deep to shallow
        return bottleneck, [s4, s3, s2, s1]

class DecoderBlock(nn.Module):
    """
    A single block in the decoder path. It concatenates the upsampled features
    with the corresponding skip connection and applies two convolutions.
    """
    def __init__(self, in_channels, skip_channels, out_channels):
        super().__init__()
        # The first convolution takes the concatenated feature maps
        self.conv1 = nn.Conv2d(in_channels + skip_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.relu1 = nn.ReLU(inplace=True)

        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.relu2 = nn.ReLU(inplace=True)

    def forward(self, x, skip_connection):
        # Concatenate along the channel dimension
        x = torch.cat([x, skip_connection], dim=1)
        x = self.relu1(self.bn1(self.conv1(x)))
        x = self.relu2(self.bn2(self.conv2(x)))
        return x

class Decoder(nn.Module):
    """
    The decoder part of the U-Net. It takes the bottleneck and skip connections
    from the Encoder and upsamples them to reconstruct the original image.
    """
    def __init__(self, n_classes=3):
        super().__init__()
        # Center (Bottleneck processing)
        self.center_conv = nn.Conv2d(1024, 512, kernel_size=1)

        # Decoder blocks
        self.dec_block1 = DecoderBlock(512, 232, 256)
        self.dec_block2 = DecoderBlock(256, 116, 128)
        self.dec_block3 = DecoderBlock(128, 24, 64)
        self.dec_block4 = DecoderBlock(64, 24, 32)

        # Final output layer
        self.final_conv = nn.Conv2d(32, n_classes, kernel_size=1)

    def forward(self, bottleneck, skips):
        d = self.center_conv(bottleneck) # -> [N, 512, 2, 2]
        d = F.interpolate(d, scale_factor=2, mode='bilinear', align_corners=True)
        d = self.dec_block1(d, skips[0])
        d = F.interpolate(d, scale_factor=2, mode='bilinear', align_corners=True)
        d = self.dec_block2(d, skips[1])
        d = F.interpolate(d, scale_factor=2, mode='bilinear', align_corners=True)
        d = self.dec_block3(d, skips[2])
        d = F.interpolate(d, scale_factor=2, mode='bilinear', align_corners=True)
        d = self.dec_block4(d, skips[3])
        d = F.interpolate(d, scale_factor=2, mode='bilinear', align_corners=True)
        output = self.final_conv(d)
        return torch.sigmoid(output)

app = FastAPI(title="U-Net Image Reconstruction API", version="1.0")

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

image_transforms = transforms.Compose([
    transforms.Resize((64, 64)),
    transforms.ToTensor(),
])

try:
    # Load base ShuffleNetV2
    weights = torchvision.models.ShuffleNet_V2_X1_0_Weights.IMAGENET1K_V1
    shufflenet_original = torchvision.models.shufflenet_v2_x1_0(weights=weights)

    # Instantiate Encoder and Decoder
    loaded_encoder = Encoder(shufflenet_original).to(device)
    loaded_decoder = Decoder(n_classes=3).to(device)

    # Load the trained weights
    model_path = "autoencoder_shufflenet.pth"
    checkpoint = torch.load(model_path, map_location=device)
    loaded_encoder.load_state_dict(checkpoint['encoder_state_dict'])
    loaded_decoder.load_state_dict(checkpoint['decoder_state_dict'])

    # Set models to evaluation mode
    loaded_encoder.eval()
    loaded_decoder.eval()
    print("Model loaded and ready for inference.")

except FileNotFoundError:
    print(f"ERROR: Could not find the weights file '{model_path}'. The API will not work.")
    loaded_encoder = None
    loaded_decoder = None


@app.post("/reconstruct/", response_model=Dict[str, Any])
async def reconstruct_image(file: UploadFile = File(...)):
    """
    Receives an image, passes it through the autoencoder, and returns
    the bottleneck latent vector and the reconstructed image.

    - **Input**: An image file (PNG, JPG, etc.).
    - **Output**: A JSON with:
      - `encoder_output`: The bottleneck tensor as a list.
      - `reconstructed_image`: The reconstructed image in Base64 format.
    """
    if not loaded_encoder or not loaded_decoder:
        raise HTTPException(status_code=500, detail="The model is not loaded. Check the server logs.")

    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert('RGB')
        input_tensor = image_transforms(pil_image).unsqueeze(0).to(device)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process the image file: {e}")

    with torch.no_grad():
        latent_bottleneck, latent_skips = loaded_encoder(input_tensor)
        reconstructed_tensor = loaded_decoder(latent_bottleneck, latent_skips)

    encoder_output_list = latent_bottleneck.cpu().numpy().tolist()

    reconstructed_tensor = reconstructed_tensor.squeeze(0).cpu()
    rec_pil_image = transforms.ToPILImage()(reconstructed_tensor)

    buffered = io.BytesIO()
    rec_pil_image.save(buffered, format="PNG")
    img_str_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    return JSONResponse(content={
        "encoder_output": encoder_output_list,
        "reconstructed_image": img_str_base64
    })

@app.get("/", include_in_schema=False)
def root():
    return {"message": "Welcome to the Image Reconstruction API. Go to /docs for documentation."}