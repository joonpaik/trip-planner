interface DateDisplayProps {
  date: Date;
  format?: 'short' | 'long' | 'time' | 'full';
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = 'short',
}) => {
  const formatDate = (date: Date, format: string) => {
    switch (format) {
      case 'short':
        return date.toLocaleDateString();
      case 'long':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'time':
        return date.toLocaleTimeString();
      case 'full':
        return date.toLocaleString();
      default:
        return date.toString();
    }
  };

  return <span>{formatDate(date, format)}</span>;
};
