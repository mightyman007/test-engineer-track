import { useParams } from 'react-router';
import { ExamRunner } from '../components/ExamRunner.js';

export function ExamPage() {
  const { examId } = useParams();
  if (!examId) return <p className="muted">No exam.</p>;
  return <ExamRunner />;
}
