import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { getAllAccessibleDeliverables, Deliverable } from '../lib/accessControl';
import Button from './Button';
import IconButton from './IconButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDeliverables = async () => {
      try {
        const allAccessibleDeliverables = await getAllAccessibleDeliverables();
        const deliverablesWithDeadlines = allAccessibleDeliverables.filter(
          deliverable => deliverable.online_deadline || deliverable.offline_deadline
        );
        setDeliverables(deliverablesWithDeadlines);
      } catch (error) {
        console.error('Error fetching accessible deliverables:', error);
        setDeliverables([]);
      }
      setLoading(false);
    };

    fetchDeliverables();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getDeliverablesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return deliverables.filter(deliverable => 
      deliverable.online_deadline === dateString || deliverable.offline_deadline === dateString
    );
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    const deliverablesForDate = getDeliverablesForDate(date);
    if (deliverablesForDate.length > 0) {
      // Navigate to the first deliverable's detail page
      const firstDeliverable = deliverablesForDate[0];
      router.push(`/deliverables/${firstDeliverable.id}`);
    }
  };

  const handleDeliverableClick = (deliverable: Deliverable, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the date click
    router.push(`/deliverables/${deliverable.id}`);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = getDaysInMonth(currentDate);

  if (loading) {
    return <div className="text-gray-400">Loading calendar...</div>;
  }

  return (
          <div className="bg-gray-700 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <IconButton
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            onClick={goToPreviousMonth}
          />
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <IconButton
            variant="ghost"
            size="sm"
            icon={ChevronRight}
            onClick={goToNextMonth}
          />
        </div>
        <Button
          onClick={goToToday}
          variant="secondary"
          size="sm"
        >
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-400">
            {day}
          </div>
        ))}
        
        {days.map((date, index) => (
          <div
            key={index}
            className={`p-2 min-h-[80px] border border-gray-700 ${
                              date ? 'hover:bg-gray-500 cursor-pointer' : ''
            }`}
            onClick={() => date && handleDateClick(date)}
          >
            {date && (
              <>
                <div className="text-sm mb-1">
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {getDeliverablesForDate(date).map((deliverable, deliverableIndex) => (
                    <div
                      key={deliverable.id}
                      className="text-xs p-1 bg-gray-600 rounded truncate"
                      title={`${deliverable.name} - ${deliverable.release?.title || 'Unknown Release'}`}
                      onClick={(e) => handleDeliverableClick(deliverable, e)}
                    >
                      {deliverable.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 