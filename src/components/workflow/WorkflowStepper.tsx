import { Check, PanelLeft, Tags, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WorkflowStep } from '../../types';

const STEPS = [
  { id: WorkflowStep.IMPORT, labelKey: 'import' },
  { id: WorkflowStep.PREPROCESS, labelKey: 'preprocess' },
  { id: WorkflowStep.TAGGING, labelKey: 'tagging' },
  { id: WorkflowStep.REVIEW, labelKey: 'review' },
  { id: WorkflowStep.EXPORT, labelKey: 'export' },
];

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export function WorkflowStepper({
  currentStep,
  onStepChange,
  onToggleSidebar,
  sidebarOpen,
}: WorkflowStepperProps) {
  const { t } = useTranslation();
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
  return (
    <header className='tm-app-header'>
      <div className='tm-brand'>
        <span className='tm-brand-mark'>
          <Tags size={17} />
        </span>
        Tag Master
      </div>
      <button
        className='tm-button tm-mobile-menu'
        onClick={onToggleSidebar}
        aria-label={t('uiToggleSidebar')}
        aria-expanded={sidebarOpen}
      >
        <PanelLeft size={20} />
      </button>
      <nav className='tm-steps' aria-label={t('uiWorkflow')}>
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            className='tm-button tm-step'
            onClick={() => onStepChange(step.id)}
            disabled={index > currentIndex}
            aria-current={index === currentIndex ? 'step' : undefined}
            aria-label={`${index + 1}. ${t(step.labelKey)}`}
            title={t(step.labelKey)}
          >
            <span className='tm-step-number' aria-hidden='true'>
              {index < currentIndex ? <Check size={11} /> : index + 1}
            </span>
            <span>{t(step.labelKey)}</span>
          </button>
        ))}
      </nav>
      <span className='tm-header-meta'>
        <ShieldCheck size={13} />
        {t('uiLocalWorkspace')}
      </span>
    </header>
  );
}
