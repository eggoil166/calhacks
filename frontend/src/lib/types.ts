export interface CADParameter {
  name: string;
  label: string;
  unit: string;
  type: 'number';
  default: number;
  min: number;
  max: number;
  step: number;
}


