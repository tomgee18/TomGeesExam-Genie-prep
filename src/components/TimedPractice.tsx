
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, Square } from 'lucide-react';

interface TimedPracticeProps {
  onStartPractice: (timeLimit: number) => void;
}

const TimedPractice = ({ onStartPractice }: TimedPracticeProps) => {
  const [selectedTime, setSelectedTime] = useState(30);

  const timeOptions = [
    { value: 15, label: '15 Minutes', description: 'Quick practice session' },
    { value: 30, label: '30 Minutes', description: 'Standard exam duration' },
    { value: 45, label: '45 Minutes', description: 'Extended practice' },
    { value: 60, label: '1 Hour', description: 'Full exam simulation' },
    { value: 90, label: '90 Minutes', description: 'Comprehensive test' },
    { value: 120, label: '2 Hours', description: 'Extended exam format' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Timed Practice</h2>
        <p className="text-gray-600">Choose your practice session duration and test your knowledge under time pressure</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Select Practice Duration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {timeOptions.map((option) => (
              <Card 
                key={option.value}
                className={`cursor-pointer transition-all ${
                  selectedTime === option.value 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedTime(option.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{option.label}</h4>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {selectedTime === option.value && (
                        <Badge>Selected</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Timed Practice Features:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Countdown timer with visual indicators</li>
              <li>• Auto-submit when time expires</li>
              <li>• Time warnings at 5 and 1 minute remaining</li>
              <li>• Performance tracking and timing analysis</li>
              <li>• Pause and resume functionality</li>
            </ul>
          </div>

          <Button 
            onClick={() => onStartPractice(selectedTime)} 
            className="w-full" 
            size="lg"
          >
            <Play className="w-4 h-4 mr-2" />
            Start {selectedTime} Minute Practice Session
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Practice Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Before You Start:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Find a quiet environment</li>
                <li>• Have all materials ready</li>
                <li>• Close distracting applications</li>
                <li>• Set your phone to silent</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">During Practice:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Read questions carefully</li>
                <li>• Manage your time wisely</li>
                <li>• Skip difficult questions initially</li>
                <li>• Review answers if time permits</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimedPractice;
