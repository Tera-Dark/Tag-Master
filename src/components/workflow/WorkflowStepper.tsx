import React from 'react';
import { WorkflowStep } from '../../types';
import { useTranslation } from 'react-i18next';

interface WorkflowStepperProps {
    currentStep: WorkflowStep;
    onStepChange: (step: WorkflowStep) => void;
}

const STEPS = [
    { id: WorkflowStep.IMPORT, labelKey: 'import' },
    { id: WorkflowStep.PREPROCESS, labelKey: 'preprocess' },
    { id: WorkflowStep.TAGGING, labelKey: 'tagging' },
    { id: WorkflowStep.REVIEW, labelKey: 'review' },
    { id: WorkflowStep.EXPORT, labelKey: 'export' },
];

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentStep, onStepChange }) => {
    const { t } = useTranslation();
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);

    return (
        <header className="w-full bg-white dark:bg-[#171717] border-b border-black/[0.06] dark:border-white/[0.08] px-6 py-3 select-none transition-colors shrink-0 z-30">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Left: Brand / Title */}
                <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        Tag Master
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700 text-sm">/</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                        {t(STEPS[currentIndex]?.labelKey || 'tagging')}
                    </span>
                </div>

                {/* Center: Floating Segmented Pill */}
                <nav aria-label="Workflow Steps" className="inline-flex items-center p-1.5 bg-zinc-100/90 dark:bg-zinc-800/90 rounded-full border border-black/[0.04] dark:border-white/[0.06] shadow-xs">
                    {STEPS.map((step, index) => {
                        const isActive = index === currentIndex;
                        const isCompleted = index < currentIndex;
                        const isPending = index > currentIndex;

                        return (
                            <button
                                key={step.id}
                                onClick={() => onStepChange(step.id)}
                                disabled={isPending}
                                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 active:scale-95 ${
                                    isActive
                                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                                        : isCompleted
                                            ? 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05] font-medium'
                                            : 'text-zinc-400 dark:text-zinc-500 cursor-default opacity-60 font-normal'
                                }`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono leading-none ${
                                    isActive 
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold' 
                                        : isCompleted 
                                            ? 'bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-bold' 
                                            : 'bg-transparent text-zinc-400 dark:text-zinc-500'
                                }`}>
                                    {isCompleted ? '✓' : index + 1}
                                </span>
                                <span>{t(step.labelKey)}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Right: Step Indicator */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400 dark:text-zinc-500 font-mono">
                        {currentIndex + 1} / {STEPS.length}
                    </span>
                </div>
            </div>
        </header>
    );
};

