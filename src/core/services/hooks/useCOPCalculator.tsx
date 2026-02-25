// hooks/useCOPCalculator.ts
import { useCallback, useRef } from 'react';
import type { ESP32Data } from './useWebSocketFrontend';

export interface COPData {
  timestamp: number;
  copX: number;          // Coordenada X del COP (mm)
  copY: number;          // Coordenada Y del COP (mm)
  copMedLat: number;     // Desplazamiento Medio-Lateral (mm)
  copCranCaud: number;   // Desplazamiento Craneal-Caudal (mm)
  totalForce: number;    // Fuerza total (kg)
  supportSurface: number; // Superficie de soporte (mm²)
}

export interface COPStatistics {
  medLat: {
    mean: number;
    std: number;
    se: number;
    values: number[];
  };
  cranCaud: {
    mean: number;
    std: number;
    se: number;
    values: number[];
  };
  supportSurface: {
    mean: number;
    std: number;
    se: number;
  };
  statokinesiogramLength: number; // Longitud total recorrida
  sampleSize: number;
}

// Configuración geométrica de los sensores (en mm desde el centro)
const SENSOR_POSITIONS = {
  LF: { x: -150, y: 200 },  // Left Front
  RF: { x: 150, y: 200 },   // Right Front
  LB: { x: -150, y: -200 }, // Left Back
  RB: { x: 150, y: -200 }   // Right Back
};

export function useCOPCalculator() {
  const previousCOPRef = useRef<{ x: number; y: number } | null>(null);
  const statokinesiogramLengthRef = useRef(0);

  // Extraer valor numérico de WeightDistribution
  const extractWeightValue = useCallback((weightData: any): number => {
    if (!weightData) return 0;
    try {
      const parsed = typeof weightData === 'string' ? JSON.parse(weightData) : weightData;
      // Puede venir como { value: number } o { percentage: number } o directamente number
      return parsed?.value || parsed?.percentage || parsed || 0;
    } catch {
      return 0;
    }
  }, []);

  // Calcular superficie de soporte (polígono convexo de las patas con peso)
  const calculateSupportSurface = useCallback((weights: { LF: number; RF: number; LB: number; RB: number }): number => {
    const total = weights.LF + weights.RF + weights.LB + weights.RB;
    if (total === 0) return 0;
    
    const threshold = total * 0.05; // 5% del peso total como umbral
    const points: { x: number; y: number }[] = [];
    
    if (weights.LF > threshold) points.push(SENSOR_POSITIONS.LF);
    if (weights.RF > threshold) points.push(SENSOR_POSITIONS.RF);
    if (weights.LB > threshold) points.push(SENSOR_POSITIONS.LB);
    if (weights.RB > threshold) points.push(SENSOR_POSITIONS.RB);
    
    if (points.length < 3) return 0;
    
    // Calcular área del polígono (fórmula de Gauss)
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  }, []);

  // Calcular COP para un punto de datos
  const calculateCOP = useCallback((data: ESP32Data): COPData | null => {
    // Extraer pesos
    const weights = {
      LF: extractWeightValue(data.weightDistributionLF),
      RF: extractWeightValue(data.weightDistributionRF),
      LB: extractWeightValue(data.weightDistributionLB),
      RB: extractWeightValue(data.weightDistributionRB)
    };

    const totalForce = weights.LF + weights.RF + weights.LB + weights.RB;
    
    if (totalForce === 0) return null;

    // Calcular COP ponderado
    const copX = (
      weights.LF * SENSOR_POSITIONS.LF.x +
      weights.RF * SENSOR_POSITIONS.RF.x +
      weights.LB * SENSOR_POSITIONS.LB.x +
      weights.RB * SENSOR_POSITIONS.RB.x
    ) / totalForce;

    const copY = (
      weights.LF * SENSOR_POSITIONS.LF.y +
      weights.RF * SENSOR_POSITIONS.RF.y +
      weights.LB * SENSOR_POSITIONS.LB.y +
      weights.RB * SENSOR_POSITIONS.RB.y
    ) / totalForce;

    // Actualizar longitud del estatokinesiograma
    if (previousCOPRef.current) {
      const distance = Math.sqrt(
        Math.pow(copX - previousCOPRef.current.x, 2) +
        Math.pow(copY - previousCOPRef.current.y, 2)
      );
      statokinesiogramLengthRef.current += distance;
    }
    previousCOPRef.current = { x: copX, y: copY };

    // Calcular superficie de soporte
    const supportSurface = calculateSupportSurface(weights);

    return {
      timestamp: Date.now(),
      copX,
      copY,
      copMedLat: Math.abs(copX),
      copCranCaud: Math.abs(copY),
      totalForce,
      supportSurface
    };
  }, [extractWeightValue, calculateSupportSurface]);

  // Calcular estadísticos de una sesión completa
  const calculateSessionStatistics = useCallback((copDataArray: COPData[]): COPStatistics | null => {
    if (copDataArray.length === 0) return null;

    const medLatValues = copDataArray.map(d => d.copMedLat);
    const cranCaudValues = copDataArray.map(d => d.copCranCaud);
    const surfaceValues = copDataArray.map(d => d.supportSurface);

    // Función para calcular media
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    // Función para calcular desviación estándar
    const std = (arr: number[], meanVal: number) => {
      const squareDiffs = arr.map(v => Math.pow(v - meanVal, 2));
      return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
    };

    const medLatMean = mean(medLatValues);
    const cranCaudMean = mean(cranCaudValues);
    const surfaceMean = mean(surfaceValues);

    const medLatStd = std(medLatValues, medLatMean);
    const cranCaudStd = std(cranCaudValues, cranCaudMean);
    const surfaceStd = std(surfaceValues, surfaceMean);

    const n = copDataArray.length;

    return {
      medLat: {
        mean: medLatMean,
        std: medLatStd,
        se: medLatStd / Math.sqrt(n),
        values: medLatValues
      },
      cranCaud: {
        mean: cranCaudMean,
        std: cranCaudStd,
        se: cranCaudStd / Math.sqrt(n),
        values: cranCaudValues
      },
      supportSurface: {
        mean: surfaceMean,
        std: surfaceStd,
        se: surfaceStd / Math.sqrt(n)
      },
      statokinesiogramLength: statokinesiogramLengthRef.current,
      sampleSize: n
    };
  }, []);

  // Calcular p-value entre dos condiciones (prueba t de Student)
  const calculatePValue = useCallback((condition1: number[], condition2: number[]): number => {
    if (condition1.length === 0 || condition2.length === 0) return 1;

    const mean1 = condition1.reduce((a, b) => a + b, 0) / condition1.length;
    const mean2 = condition2.reduce((a, b) => a + b, 0) / condition2.length;
    
    const var1 = condition1.map(v => Math.pow(v - mean1, 2)).reduce((a, b) => a + b, 0) / (condition1.length - 1);
    const var2 = condition2.map(v => Math.pow(v - mean2, 2)).reduce((a, b) => a + b, 0) / (condition2.length - 1);
    
    const pooledStd = Math.sqrt((var1 / condition1.length) + (var2 / condition2.length));
    const tStatistic = (mean1 - mean2) / pooledStd;
    
    // Grados de libertad (aproximación de Welch)
    const df = Math.pow(var1 / condition1.length + var2 / condition2.length, 2) /
      (Math.pow(var1 / condition1.length, 2) / (condition1.length - 1) +
       Math.pow(var2 / condition2.length, 2) / (condition2.length - 1));
    
    // Aproximación del p-value (distribución t de Student)
    // Esta es una simplificación; para valores exactos usar librería estadística
    const pValue = 2 * (1 - studentTCDF(Math.abs(tStatistic), df));
    
    return pValue;
  }, []);

  // Función de distribución acumulativa t de Student (aproximación)
  const studentTCDF = (t: number, df: number): number => {
    // Aproximación simplificada
    const x = df / (df + t * t);
    return 1 - 0.5 * Math.pow(x, df / 2) * betainc(df / 2, 0.5, x);
  };

  // Aproximación de función beta incompleta (simplificada)
  const betainc = (a: number, b: number, x: number): number => {
    // Implementación simplificada - en producción usar librería
    return Math.pow(x, a) * Math.pow(1 - x, b) / (a * beta(a, b));
  };

  const beta = (a: number, b: number): number => {
    return Math.exp(lgamma(a) + lgamma(b) - lgamma(a + b));
  };

  const lgamma = (z: number): number => {
    // Aproximación de Stirling para log-gamma
    return 0.5 * Math.log(2 * Math.PI) + (z - 0.5) * Math.log(z) - z;
  };

  // Resetear el cálculo de longitud
  const resetLength = useCallback(() => {
    previousCOPRef.current = null;
    statokinesiogramLengthRef.current = 0;
  }, []);

  return {
    calculateCOP,
    calculateSessionStatistics,
    calculatePValue,
    resetLength
  };
}