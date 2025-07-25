"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './loading-animation.module.css';
import { cn } from "@/lib/utils";

export function LoadingAnimation() {
    const stageElementsRef = useRef<(HTMLDivElement | null)[]>([]);
    const [visibility, setVisibility] = useState<boolean[]>(new Array(5).fill(false));
    const [progress, setProgress] = useState(0);
    const [loaderText, setLoaderText] = useState('Procesando...');

    // Este efecto ejecuta toda la lógica de la animación
    useEffect(() => {
        // Reinicia el estado en caso de que el componente se reutilice
        setVisibility(new Array(5).fill(false));
        setProgress(0);
        setLoaderText('Procesando...');

        const stageGroups = stageElementsRef.current.filter(el => el !== null) as HTMLDivElement[];
        if (stageGroups.length !== 5) return;

        const prepareAnimations = () => {
             // Empieza desde el segundo elemento, ya que el primero no tiene predecesor
            for (let i = 1; i < stageGroups.length; i++) {
                const currentEl = stageGroups[i];
                const prevEl = stageGroups[i - 1];
                if (!currentEl || !prevEl) continue;

                const currentRect = currentEl.getBoundingClientRect();
                const prevRect = prevEl.getBoundingClientRect();

                const offsetX = prevRect.left - currentRect.left + (prevRect.width - currentRect.width) / 2;
                const offsetY = prevRect.top - currentRect.top + (prevRect.height - currentRect.height) / 2;

                currentEl.style.setProperty('--start-x', `${offsetX}px`);
                currentEl.style.setProperty('--start-y', `${offsetY}px`);
            }
        };

        let currentStageIndex = 0;
        const totalStages = stageGroups.length;
        let loaderInterval: NodeJS.Timeout;

        const showNextStage = () => {
            if (currentStageIndex >= totalStages) {
                clearInterval(loaderInterval);
                return;
            }

            setVisibility(prev => {
                const newVisibility = [...prev];
                newVisibility[currentStageIndex] = true;
                return newVisibility;
            });

            const percentage = Math.round(((currentStageIndex + 1) / totalStages) * 100);
            setProgress(percentage);

            if (currentStageIndex === totalStages - 1) {
                setLoaderText('¡Carga Completa!');
            }

            currentStageIndex++;
        };
        
        // Espera un momento para asegurar la estabilidad del layout antes de medir
        const setupTimeout = setTimeout(() => {
            prepareAnimations();
            showNextStage(); // Muestra la primera etapa inmediatamente
            loaderInterval = setInterval(showNextStage, 1000); // Inicia el resto
        }, 100);

        // Función de limpieza para desmontar el componente
        return () => {
            clearTimeout(setupTimeout);
            clearInterval(loaderInterval);
        };
    }, []); // El array vacío asegura que esto se ejecute una sola vez al montar

    const stages = [
        <div key="1" className={cn(styles.stageElement, styles.grid, styles.grid3x3, styles.firstStage, { [styles.isVisible]: visibility[0] })} ref={el => stageElementsRef.current[0] = el}>
            {[...Array(9)].map((_, i) => <div key={i} className={styles.box}></div>)}
        </div>,
        <div key="2" className={cn(styles.stageElement, styles.grid, styles.grid2x2, { [styles.isVisible]: visibility[1] })} ref={el => stageElementsRef.current[1] = el}>
            {[...Array(4)].map((_, i) => <div key={i} className={styles.box}></div>)}
        </div>,
        <div key="3" className={cn(styles.stageElement, { [styles.isVisible]: visibility[2] })} ref={el => stageElementsRef.current[2] = el}>
            <div className={styles.box}></div>
        </div>,
        <div key="4" className={cn(styles.stageElement, styles.grid, styles.grid2x2, { [styles.isVisible]: visibility[3] })} ref={el => stageElementsRef.current[3] = el}>
            {[...Array(4)].map((_, i) => <div key={i} className={styles.box}></div>)}
        </div>,
        <div key="5" className={cn(styles.stageElement, styles.grid, styles.grid3x3, { [styles.isVisible]: visibility[4] })} ref={el => stageElementsRef.current[4] = el}>
            {[...Array(9)].map((_, i) => <div key={i} className={styles.box}></div>)}
        </div>
    ];

    return (
        <div className={styles.loaderContainer}>
            <div className={styles.loaderStages}>
                {stages}
            </div>
            <div className={styles.loaderStatus}>
                <span>{loaderText}</span>
                <span className="ml-2">{progress}%</span>
            </div>
        </div>
    );
}