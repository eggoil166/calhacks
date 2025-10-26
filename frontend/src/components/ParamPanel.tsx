import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sliders, RotateCcw } from 'lucide-react';
import type { CADParameter } from '../lib/types';

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

  const resetToDefaults = () => {
    const defaultValues: Record<string, number> = {};
    parameters.forEach(param => {
      defaultValues[param.name] = param.default;
    });
    setValues(defaultValues);
    onParametersChange(defaultValues);
  };

  if (parameters.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="tech-glass rounded-3xl shadow-2xl p-8 space-y-6 tech-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div 
              className="h-10 w-10 rounded-xl flex items-center justify-center tech-glow animate-pulse-glow"
              style={{
                background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-tertiary))',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Adjust parameters • Units: {units}</p>
            </div>
          </div>
          
          <motion.button
            onClick={resetToDefaults}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 tech-border"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-secondary)'
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </motion.button>
        </div>

        {isRegenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl tech-border"
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              color: 'var(--accent-primary)'
            }}
          >
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">Regenerating mesh...</span>
          </motion.div>
        )}

        <div className="grid gap-6">
          {parameters.map((param, index) => (
            <motion.div
              key={param.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {param.label}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={values[param.name] ?? param.default}
                    onChange={(e) => handleChange(param.name, parseFloat(e.target.value))}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    className="w-24 px-3 py-2 text-sm rounded-xl transition-all duration-200 tech-border"
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-secondary)',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-primary)';
                      e.target.style.boxShadow = 'var(--shadow-glow)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-secondary)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <span className="text-sm font-medium w-8" style={{ color: 'var(--text-secondary)' }}>{param.unit}</span>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  value={values[param.name] ?? param.default}
                  onChange={(e) => handleChange(param.name, parseFloat(e.target.value))}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer slider tech-border"
                  style={{
                    background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-secondary) 100%)`,
                    border: '1px solid var(--border-primary)'
                  }}
                />
                <div className="flex justify-between text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-medium">{param.min}</span>
                  <span className="font-medium">{param.max}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
