import { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';
import type { CADParameter } from '../lib/supabase';

interface ParamPanelProps {
  parameters: CADParameter[];
  title: string;
  units: string;
  onParametersChange: (params: Record<string, number>) => void;
  isRegenerating: boolean;
}

export function ParamPanel({
  parameters,
  title,
  units,
  onParametersChange,
  isRegenerating
}: ParamPanelProps) {
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const initialValues: Record<string, number> = {};
    parameters.forEach(param => {
      initialValues[param.name] = param.default;
    });
    setValues(initialValues);
    onParametersChange(initialValues);
  }, [parameters]);

  const handleChange = (paramName: string, value: number) => {
    const newValues = { ...values, [paramName]: value };
    setValues(newValues);
    onParametersChange(newValues);
  };

  if (parameters.length === 0) return null;

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex items-center gap-2 text-gray-700 font-medium">
        <Sliders className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg">{title}</h2>
        <span className="text-sm text-gray-500">({units})</span>
      </div>

      {isRegenerating && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Regenerating mesh...
        </div>
      )}

      <div className="grid gap-4">
        {parameters.map(param => (
          <div key={param.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {param.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={values[param.name] ?? param.default}
                  onChange={(e) => handleChange(param.name, parseFloat(e.target.value))}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500 w-8">{param.unit}</span>
              </div>
            </div>
            <input
              type="range"
              value={values[param.name] ?? param.default}
              onChange={(e) => handleChange(param.name, parseFloat(e.target.value))}
              min={param.min}
              max={param.max}
              step={param.step}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{param.min}</span>
              <span>{param.max}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
