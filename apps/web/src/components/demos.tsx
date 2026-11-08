import type { ComponentType } from 'react';
import { PerceptronDemo } from './PerceptronDemo.js';

/**
 * Lesson demos registry: a lesson's frontmatter `demo = "<name>"` names a key
 * here, and LessonPage renders that component below the lesson body. Adding a
 * demo means authoring a component and adding one entry — LessonPage itself
 * stays generic.
 */
export const LESSON_DEMOS: Record<string, ComponentType> = {
  perceptron: PerceptronDemo,
};
