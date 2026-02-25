import type { DataSense } from "./dataSense";

export interface SymmetryIndex {
  value?: number;
  unit?: string;
  [key: string]: any;
}

export interface WeightDistribution {
  percentage?: number;
  value?: number;
  [key: string]: any;
}

export interface VerticalForce {
  value?: number;
  unit?: string;
  [key: string]: any;
}

export interface SensorData {
  x?: number[];
  y?: number[];
  z?: number[];
  timestamps?: number[];
  [key: string]: any;
}


export interface TypedDataSense extends Omit<DataSense, 
  'symmetryIndexLF' | 
  'symmetryIndexRF' | 
  'symmetryIndexLB' | 
  'symmetryIndexRB' | 
  'weightDistributionLF' | 
  'weightDistributionRF' | 
  'weightDistributionLB' | 
  'weightDistributionRB' | 
  'verticalForce' | 
  'gyroscope' | 
  'accelerometer'
> {
  symmetryIndexLF: SymmetryIndex | null;
  symmetryIndexRF: SymmetryIndex | null;
  symmetryIndexLB: SymmetryIndex | null;
  symmetryIndexRB: SymmetryIndex | null;
  weightDistributionLF: WeightDistribution | null;
  weightDistributionRF: WeightDistribution | null;
  weightDistributionLB: WeightDistribution | null;
  weightDistributionRB: WeightDistribution | null;
  verticalForce: VerticalForce | null;
  gyroscope: SensorData | null;
  accelerometer: SensorData | null;
}