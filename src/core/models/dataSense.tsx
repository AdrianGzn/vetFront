export interface SymmetryIndex {
  value?: number;
  unit?: string;
  [key: string]: any;
}

export interface WeightDistribution {
  percentage?: number;
  value?: number;
  unit?: string;
  [key: string]: any;
}

export interface VerticalForce {
  value?: number;
  unit?: string;
  [key: string]: any;
}

export interface SensorData {
  x?: number;
  y?: number;
  z?: number;
  [key: string]: any;
}


export interface SensorDataArray {
  x?: number[];
  y?: number[];
  z?: number[];
  timestamps?: number[];
  [key: string]: any;
}


export interface DataSense {
  id: number;
  idAppointment: number;
  type: string;
  totalTime: string;
  frequencyHZ: number;
  amplitudeMV: number;
  
  
  COPN: any | null;
  COPC: any | null;
  result: any | null;
  
  
  gyroscope: any | null;
  accelerometer: any | null;
  
  
  symmetryIndexLF: any | null;
  symmetryIndexRF: any | null;
  symmetryIndexLB: any | null;
  symmetryIndexRB: any | null;
  
  
  weightDistributionLF: any | null;
  weightDistributionRF: any | null;
  weightDistributionLB: any | null;
  weightDistributionRB: any | null;
  
  
  verticalForce: any | null;
  verticalImpulse: string;
}


export interface CreateDataSenseDto {
  idAppointment: number;
  type: string;
  totalTime: string;
  frequencyHZ: number;
  amplitudeMV: number;
  
  
  COPN?: any;
  COPC?: any;
  result?: any;
  
  gyroscope?: any;
  accelerometer?: any;
  
  symmetryIndexLF?: any;
  symmetryIndexRF?: any;
  symmetryIndexLB?: any;
  symmetryIndexRB?: any;
  
  weightDistributionLF?: any;
  weightDistributionRF?: any;
  weightDistributionLB?: any;
  weightDistributionRB?: any;
  
  verticalForce?: any;
  verticalImpulse: string;
}

export interface UpdateDataSenseDto extends Partial<CreateDataSenseDto> {}


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
  
  symmetryIndexLF: SymmetryIndex[] | null;
  symmetryIndexRF: SymmetryIndex[] | null;
  symmetryIndexLB: SymmetryIndex[] | null;
  symmetryIndexRB: SymmetryIndex[] | null;
  
  weightDistributionLF: WeightDistribution[] | null;
  weightDistributionRF: WeightDistribution[] | null;
  weightDistributionLB: WeightDistribution[] | null;
  weightDistributionRB: WeightDistribution[] | null;
  
  verticalForce: VerticalForce[] | null;
  
  
  gyroscope: SensorData[] | null;
  accelerometer: SensorData[] | null;
  
  
  verticalImpulseArray?: number[];
}


export interface TypedDataSenseSingle extends Omit<DataSense, 
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
  // Objetos individuales
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