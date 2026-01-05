'use client';

import React, { useState } from 'react';
import {
    BookOpen,
    Shield,
    AlertTriangle,
    CheckCircle2,
    Info,
    HelpCircle,
    FileText,
    Star,
    Clock,
    Edit,
} from 'lucide-react';

export default function GuidelinesPage() {
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    const plagiarismTypes = [
        {
            title: 'Direct Plagiarism',
            description: 'Copying text word-for-word from a source without quotation marks or citation.',
            severity: 'high',
            example: 'Taking entire paragraphs from Wikipedia and presenting them as your own work.',
        },
        {
            title: 'Self-Plagiarism',
            description: 'Resubmitting your own previous work without permission or acknowledgment.',
            severity: 'high',
            example: 'Submitting an essay you wrote for another class without instructor approval.',
        },
        {
            title: 'Mosaic Plagiarism',
            description: 'Mixing copied phrases with your own words without proper citation.',
            severity: 'high',
            example: 'Paraphrasing by changing a few words but keeping the original structure and ideas.',
        },
        {
            title: 'Accidental Plagiarism',
            description: 'Failing to cite sources properly or unintentionally using similar phrasing.',
            severity: 'moderate',
            example: 'Forgetting to include quotation marks around a direct quote or missing a citation.',
        },
    ];

    const scoreRanges = [
        {
            range: '0-5%',
            level: 'Excellent',
            color: 'green',
            description: 'Minimal similarity. This is the ideal range showing excellent originality.',
            icon: CheckCircle2,
        },
        {
            range: '6-10%',
            level: 'Good',
            color: 'green',
            description: 'Low similarity. Acceptable level with minor matches in common phrases or citations.',
            icon: CheckCircle2,
        },
        {
            range: '11-20%',
            level: 'Moderate',
            color: 'amber',
            description: 'Moderate similarity. Review your work to ensure proper paraphrasing and citations.',
            icon: AlertTriangle,
        },
        {
            range: '21-40%',
            level: 'High',
            color: 'red',
            description: 'High similarity. Significant revision needed. Consult with your instructor.',
            icon: AlertTriangle,
        },
        {
            range: '40%+',
            level: 'Critical',
            color: 'red',
            description: 'Critical level. May result in academic misconduct proceedings.',
            icon: AlertTriangle,
        },
    ];

    const bestPractices = [
        {
            title: 'Start Early',
            description: 'Begin your assignments well before the deadline to avoid rushed work that might lead to plagiarism.',
            icon: Clock,
        },
        {
            title: 'Take Good Notes',
            description: 'Keep detailed notes with source information to make citation easier later.',
            icon: FileText,
        },
        {
            title: 'Paraphrase Properly',
            description: 'Put ideas into your own words and sentence structure, not just synonym substitution.',
            icon: Edit,
        },
        {
            title: 'Use Multiple Sources',
            description: 'Diversify your research to develop a unique perspective rather than relying heavily on one source.',
            icon: BookOpen,
        },
        {
            title: 'Check Before Submitting',
            description: 'Always use the plagiarism checker on each version before final submission.',
            icon: Shield,
        },
        {
            title: 'Understand Citations',
            description: 'Learn the required citation style for your field and apply it consistently.',
            icon: Star,
        },
    ];

    const faqs = [
        {
            question: 'What happens if my plagiarism score is high?',
            answer: 'If your plagiarism score is above 20%, you should revise your work before submitting. The system will flag high scores for lecturer review. Repeated high scores may result in academic misconduct proceedings. Use the feedback to identify problematic sections and rewrite them in your own words.',
        },
        {
            question: 'Can I see which parts of my work are flagged?',
            answer: 'Yes! When you view your plagiarism report, you\'ll see detailed information about matched sources, including specific phrases that were flagged. This helps you identify exactly what needs to be revised or cited properly.',
        },
        {
            question: 'Why does my technical writing show high similarity?',
            answer: 'Technical terms, formulas, and standard definitions often match existing sources. This is normal and acceptable. Focus on explaining concepts in your own way and properly citing technical definitions when needed.',
        },
        {
            question: 'How do I properly paraphrase?',
            answer: 'Read the source material, then put it away and write the idea in your own words from memory. Don\'t just replace words with synonyms - restructure the sentence completely. Always cite the original source even when paraphrasing.',
        },
        {
            question: 'What if I need to quote something directly?',
            answer: 'Direct quotes are fine when necessary. Use quotation marks, keep quotes brief (usually under 3 lines), and always provide a citation. Try to limit direct quotes and favor paraphrasing when possible.',
        },
        {
            question: 'Does the plagiarism checker check against other students?',
            answer: 'Yes, the system checks against internet sources, publications, and a database of student submissions. This helps maintain academic integrity across all submissions.',
        },
        {
            question: 'What is the AI score and how is it different from plagiarism?',
            answer: 'The AI score measures the quality and coherence of your writing, not originality. It evaluates factors like clarity, organization, and depth. A high AI score is good - it means your work is well-written. Plagiarism score measures similarity to other sources.',
        },
        {
            question: 'Can I appeal a plagiarism flag?',
            answer: 'Yes. If you believe your work was improperly flagged, contact your lecturer with an explanation. Common causes include proper citations being misidentified or technical terminology.',
        },
    ];

    const submissionTips = [
        'Run the plagiarism check after completing each question',
        'Save your work frequently - each version is automatically checked',
        'Review AI feedback to improve your writing quality',
        'Don\'t copy-paste from any source - type your answers manually',
        'Use the version history to track your improvement',
        'Submit well before the deadline to avoid last-minute issues',
    ];

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Academic Integrity Guidelines</h1>
                <p className="text-gray-600">Understanding plagiarism, best practices, and how to maintain academic integrity</p>
            </div>

            {/* Important Notice */}
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-8">
                <div className="flex items-start gap-4">
                    <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                    <div>
                        <h3 className="font-bold text-red-900 mb-2">Academic Misconduct Policy</h3>
                        <p className="text-red-800 mb-2">
                            Plagiarism is a serious academic offense that can result in:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-red-800">
                            <li>Automatic failure of the assignment</li>
                            <li>Failure of the entire course</li>
                            <li>Academic probation or suspension</li>
                            <li>Permanent record on your transcript</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Types of Plagiarism */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="text-purple-600" size={28} />
                        Types of Plagiarism
                    </h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plagiarismTypes.map((type, index) => (
                            <div
                                key={index}
                                className={`p-6 rounded-lg border-2 ${
                                    type.severity === 'high'
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-amber-50 border-amber-200'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <h3 className="font-bold text-gray-900">{type.title}</h3>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                            type.severity === 'high'
                                                ? 'bg-red-200 text-red-800'
                                                : 'bg-amber-200 text-amber-800'
                                        }`}
                                    >
                    {type.severity.toUpperCase()}
                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-3">{type.description}</p>
                                <div className="p-3 bg-white rounded border border-gray-200">
                                    <p className="text-xs text-gray-600 mb-1 font-medium">Example:</p>
                                    <p className="text-xs text-gray-700">{type.example}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Score Ranges */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Info className="text-purple-600" size={28} />
                        Understanding Plagiarism Scores
                    </h2>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {scoreRanges.map((range, index) => {
                            const IconComponent = range.icon;
                            const colorClasses = {
                                green: 'bg-green-50 border-green-200 text-green-800',
                                amber: 'bg-amber-50 border-amber-200 text-amber-800',
                                red: 'bg-red-50 border-red-200 text-red-800',
                            };
                            const iconColors = {
                                green: 'text-green-600',
                                amber: 'text-amber-600',
                                red: 'text-red-600',
                            };

                            return (
                                <div key={index} className={`p-4 rounded-lg border-2 ${colorClasses[range.color as keyof typeof colorClasses]}`}>
                                    <div className="flex items-start gap-4">
                                        <IconComponent className={`flex-shrink-0 mt-1 ${iconColors[range.color as keyof typeof iconColors]}`} size={24} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-bold text-lg">{range.range}</span>
                                                <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">
                          {range.level}
                        </span>
                                            </div>
                                            <p className="text-sm">{range.description}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Best Practices */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 className="text-purple-600" size={28} />
                        Best Practices
                    </h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bestPractices.map((practice, index) => {
                            const IconComponent = practice.icon;
                            return (
                                <div key={index} className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                                        <IconComponent className="text-purple-600" size={24} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">{practice.title}</h3>
                                    <p className="text-sm text-gray-700">{practice.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Submission Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6 mb-8">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <Star className="text-blue-600" size={24} />
                    Smart Submission Tips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {submissionTips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                            <p className="text-sm text-blue-900">{tip}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQs */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <HelpCircle className="text-purple-600" size={28} />
                        Frequently Asked Questions
                    </h2>
                </div>
                <div className="divide-y divide-gray-200">
                    {faqs.map((faq, index) => (
                        <div key={index} className="p-6">
                            <button
                                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                className="w-full flex items-start justify-between gap-4 text-left"
                            >
                                <h3 className="font-semibold text-gray-900 flex-1">{faq.question}</h3>
                                <HelpCircle
                                    className={`text-purple-600 flex-shrink-0 transition-transform ${
                                        expandedFAQ === index ? 'rotate-180' : ''
                                    }`}
                                    size={20}
                                />
                            </button>
                            {expandedFAQ === index && (
                                <p className="mt-3 text-sm text-gray-700 pl-0">{faq.answer}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Get Help */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-8 text-center">
                <h3 className="text-2xl font-bold text-purple-900 mb-3">Need Help?</h3>
                <p className="text-purple-800 mb-6">
                    If you have questions about academic integrity or need clarification on plagiarism,
                    don&#39;t hesitate to reach out to your instructor or academic advisor.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                        Contact Academic Support
                    </button>
                    <button className="px-6 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium">
                        Visit Writing Center
                    </button>
                </div>
            </div>
        </div>
    );
}
