import React from 'react';
import { WorkflowStep } from '../../types';
import { CheckCircle2, Circle } from '../Icons';

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
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between relative">
                {/* Progress Bar Background */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10" />

                {/* Progress Bar Active */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 transition-all duration-300 -z-10"
                    style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
                />

                {STEPS.map((step, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;
                    const isPending = index > currentIndex;

                    return (
                        <button
                            key={step.id}
                            onClick={() => onStepChange(step.id)}
                            disabled={isPending} // Disable forward jumping? Optional. Let's allowing jumping back.
                            className={`flex flex-col items-center gap-2 group focus:outline-none ${isPending ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 
                                ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110' : ''}
                                ${isCompleted ? 'bg-white dark:bg-zinc-900 border-indigo-600 text-indigo-600' : ''}
                                ${isPending ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-300 dark:text-zinc-700' : ''}
                            `}>
                                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : (
                                    isActive ? <span className="text-xs font-bold">{index + 1}</span> : <Circle className="w-5 h-5" />
                                )}
                            </div>
                            <span className={`text-xs font-bold transition-colors duration-300 
                                ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}
                                ${isCompleted ? 'text-zinc-600 dark:text-zinc-400' : ''}
                                ${isPending ? 'text-zinc-400 dark:text-zinc-600' : ''}
                            `}>
                                {t(step.labelKey)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
