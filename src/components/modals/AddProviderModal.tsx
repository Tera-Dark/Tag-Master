import React, { useState } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';
import { DialogOverlay } from '../ui/DialogOverlay';
import { AiProvider } from '../../types';
import { PROVIDER_PRESETS, CATALOG_VERSION } from '../../services/providers/catalog';

export interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProvider: (provider: AiProvider) => void;
  onDeleteProvider?: (providerId: string) => void;
  initialProvider?: AiProvider | null;
}
export interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProvider: (provider: AiProvider) => void;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  onSaveProvider,
  initialProvider,
}) => {
  const [presetId, setPresetId] = useState('google');
  const [name, setName] = useState(initialProvider?.name || '');
  if (!isOpen) return null;
  const preset = PROVIDER_PRESETS.find((p) => p.id === presetId)!;
  return (
    <DialogOverlay
      onClose={onClose}
      label={initialProvider ? '编辑服务商' : '添加服务商'}
      className='fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4'
    >
      <form
        className='api-add-dialog'
        onSubmit={(e) => {
          e.preventDefault();
          onSaveProvider(
            initialProvider
              ? { ...initialProvider, name: name.trim() || initialProvider.name }
              : {
                  ...structuredClone(preset.provider),
                  id: crypto.randomUUID(),
                  name: name.trim() || preset.provider.name,
                  catalogVersion: CATALOG_VERSION,
                }
          );
          onClose();
        }}
      >
        <header className='api-section-heading'>
          <div>
            <h2>{initialProvider ? '编辑服务商' : '添加服务商'}</h2>
            <p>选择连接模板，下一步填写密钥与地址。</p>
          </div>
          <button
            type='button'
            className='tm-button api-icon-button'
            aria-label='关闭添加服务商'
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        {!initialProvider && (
          <div className='api-preset-grid'>
            {PROVIDER_PRESETS.map((p) => (
              <button
                key={p.id}
                type='button'
                className='api-preset tm-button'
                aria-pressed={presetId === p.id}
                onClick={() => {
                  setPresetId(p.id);
                  setName('');
                }}
              >
                <span>
                  <strong>{p.label}</strong>
                  <small>{p.description}</small>
                </span>
                {presetId === p.id && <Check size={16} />}
              </button>
            ))}
          </div>
        )}
        <label className='api-field'>
          显示名称
          <input
            className='tm-input'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={initialProvider?.name || preset.provider.name}
            maxLength={80}
          />
        </label>
        <footer className='api-dialog-footer'>
          <button className='tm-button api-button' type='button' onClick={onClose}>
            取消
          </button>
          <button className='tm-button tm-button-primary api-button' type='submit'>
            {initialProvider ? '保存名称' : '添加并配置'}
            <ArrowRight size={15} />
          </button>
        </footer>
      </form>
    </DialogOverlay>
  );
};
export const AddProviderModal: React.FC<AddProviderModalProps> = (props) => (
  <ProviderModal {...props} onSaveProvider={props.onAddProvider} />
);
