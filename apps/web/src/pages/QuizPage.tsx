import { useParams } from 'react-router';
import { QuizRunner } from '../components/QuizRunner.js';

export function QuizPage() {
  const { moduleId } = useParams();
  if (!moduleId) return <p className="muted">No module.</p>;
  return (
    <div>
      <h1>Module quiz</h1>
      <QuizRunner moduleId={moduleId} />
    </div>
  );
}
