"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Shield, Eye, Lock, Shuffle, Clock, CheckSquare } from 'lucide-react';
import { Switch } from '../ui/switch';
import { ExamSecuritySettings } from '../../lib/examStore';

interface SecuritySettingsProps {
  settings: ExamSecuritySettings;
  onChange: (settings: ExamSecuritySettings) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ settings, onChange }) => {
  const updateSetting = <K extends keyof ExamSecuritySettings>(key: K, value: ExamSecuritySettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Security & Proctoring Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monitoring & Surveillance */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Monitoring & Surveillance
          </h4>
          <div className="grid grid-cols-1 gap-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Require webcam access</div>
                <div className="text-xs text-gray-500">Students must grant camera permission to proceed</div>
              </div>
              <Switch
                checked={settings.requireWebcam}
                onCheckedChange={(val) => updateSetting('requireWebcam', val)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Enable screen monitoring</div>
                <div className="text-xs text-gray-500">Detects tab focus changes and suspicious behavior</div>
              </div>
              <Switch
                checked={settings.enableScreenMonitoring}
                onCheckedChange={(val) => updateSetting('enableScreenMonitoring', val)}
              />
            </div>
          </div>
        </div>

        {/* Browser Security */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Browser Security
          </h4>
          <div className="grid grid-cols-1 gap-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Prevent tab switching</div>
                <div className="text-xs text-gray-500">Flags when students leave the exam tab</div>
              </div>
              <Switch
                checked={settings.preventTabSwitching}
                onCheckedChange={(val) => updateSetting('preventTabSwitching', val)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Lockdown browser mode</div>
                <div className="text-xs text-gray-500">Blocks dev tools, copy/paste, right-click, Alt+Tab, print</div>
              </div>
              <Switch
                checked={settings.lockdownBrowser}
                onCheckedChange={(val) => updateSetting('lockdownBrowser', val)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Force fullscreen mode</div>
                <div className="text-xs text-gray-500">Requires and maintains fullscreen during the exam</div>
              </div>
              <Switch
                checked={settings.enableFullscreenMode}
                onCheckedChange={(val) => updateSetting('enableFullscreenMode', val)}
              />
            </div>
          </div>
        </div>

        {/* Violation Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Violation Settings
          </h4>
          <div className="pl-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxWarnings" className="text-sm">
                Maximum tab switch warnings before flagging
              </Label>
              <Input
                id="maxWarnings"
                type="number"
                min={1}
                max={10}
                value={settings.maxTabSwitchWarnings}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('maxTabSwitchWarnings', parseInt(e.target.value, 10) || 3)}
                className="w-20"
              />
              <p className="text-xs text-gray-500">
                Student will be flagged after exceeding this number of tab switches
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxViolations" className="text-sm font-medium">
                Maximum intentional violations before exam termination
              </Label>
              <Input
                id="maxViolations"
                type="number"
                min={1}
                max={20}
                value={settings.maxIntentionalViolations || 3}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('maxIntentionalViolations', parseInt(e.target.value, 10) || 3)}
                className="w-20"
              />
              <p className="text-xs text-gray-500">
                Exam will be automatically terminated after this many intentional violations (e.g., copy/paste, dev tools). 
                Technical issues (network errors, webcam failures) are not counted.
              </p>
            </div>
          </div>
        </div>

        {/* Question Randomization */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            Question Randomization
          </h4>
          <div className="grid grid-cols-1 gap-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Shuffle question order</div>
                <div className="text-xs text-gray-500">Randomizes question sequence per student</div>
              </div>
              <Switch
                checked={settings.shuffleQuestions}
                onCheckedChange={(val) => updateSetting('shuffleQuestions', val)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Shuffle answer options</div>
                <div className="text-xs text-gray-500">Randomizes answer choices for each question</div>
              </div>
              <Switch
                checked={settings.shuffleOptions}
                onCheckedChange={(val) => updateSetting('shuffleOptions', val)}
              />
            </div>
          </div>
        </div>

        {/* Results & Review */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Results & Review
          </h4>
          <div className="grid grid-cols-1 gap-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Show results immediately after submission</div>
                <div className="text-xs text-gray-500">Instant feedback upon finishing the exam</div>
              </div>
              <Switch
                checked={settings.showResultsImmediately}
                onCheckedChange={(val) => updateSetting('showResultsImmediately', val)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Allow students to review answers</div>
                <div className="text-xs text-gray-500">Permit post-exam answer review</div>
              </div>
              <Switch
                checked={settings.allowReview}
                onCheckedChange={(val) => updateSetting('allowReview', val)}
              />
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Security Notice:</strong> High security settings may require students to use supported browsers 
            and grant specific permissions. Test these settings before the exam to ensure compatibility.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecuritySettings;