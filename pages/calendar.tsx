import Layout from '../components/Layout';
import AuthWrapper from '../components/AuthWrapper';
import Calendar from '../components/Calendar';

export default function CalendarPage() {
  return (
    <AuthWrapper>
      <Layout>
        <div className="text-white">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Calendar</h1>
          </div>
          <Calendar />
        </div>
      </Layout>
    </AuthWrapper>
  );
} 