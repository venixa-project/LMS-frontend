import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackToCoursesButtonProps {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const BackToCoursesButton: React.FC<BackToCoursesButtonProps> = ({
  label = 'Back to Courses & Catalog',
  className = 'btn btn-secondary btn-sm',
  style
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // If navigation came from within the application, use history to preserve search/filters
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      // Safe fallback if the page was opened directly, refreshed, or opened in a new tab
      navigate('/courses');
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        ...style
      }}
      title="Return to Courses & Catalog"
    >
      <ArrowLeft size={14} /> {label}
    </button>
  );
};
