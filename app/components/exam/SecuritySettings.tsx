"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Shield, Eye, Lock, Shuffle, Clock, CheckSquare } from 'lucide-react';
import { ExamSecuritySettings } from '../../lib/examStore';

interface SecuritySettingsProps {
  settings: ExamSecuritySettings;
  onChange: (settings: ExamSecuritySettings) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ settings, onChange }) => {
  const updateSetting = <K extends keyof ExamSecuritySettings>(key: K, value: ExamSecuritySettings[K]) => {
    // Prevent enabling webcam and fullscreen together — make them mutually exclusive
    const nextSettings: ExamSecuritySettings = {
      ...settings,
      [key]: value,
    } as ExamSecuritySettings;

    if (key === 'requireWebcam' && value === true && settings.enableFullscreenMode) {
      // If webcam is being enabled while fullscreen is active, disable fullscreen
      nextSettings.enableFullscreenMode = false;
    }

    if (key === 'enableFullscreenMode' && value === true && settings.requireWebcam) {
      // If fullscreen is being enabled while webcam is active, disable webcam
      nextSettings.requireWebcam = false;
    }

    onChange(nextSettings);
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
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.requireWebcam}
                onChange={(e) => updateSetting('requireWebcam', e.target.checked)}
              />
              <span className="text-sm">Require webcam access</span>
            </Label>
          </div>
        </div>

        {/* Browser Security */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Browser Security
          </h4>
          <div className="grid grid-cols-1 gap-3 pl-6">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.preventTabSwitching}
                onChange={(e) => updateSetting('preventTabSwitching', e.target.checked)}
              />
              <span className="text-sm">Prevent tab switching</span>
            </Label>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={settings.lockdownBrowser}
                  onChange={(e) => updateSetting('lockdownBrowser', e.target.checked)}
                />
                <span className="text-sm font-medium">Lockdown browser mode</span>
              </Label>
              <p className="text-xs text-gray-600 ml-6 leading-relaxed">
                Enables comprehensive browser restrictions: blocks developer tools (F12, Ctrl+Shift+I/J), 
                prevents copy/paste/cut (Ctrl+C/V/X), disables right-click context menu, 
                blocks Alt+Tab window switching, and prevents printing.
              </p>
            </div>
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.enableFullscreenMode}
                onChange={(e) => updateSetting('enableFullscreenMode', e.target.checked)}
              />
              <span className="text-sm">Force fullscreen mode</span>
            </Label>
          </div>
        </div>

        {/* Tab Switch Warnings */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Warning Settings
          </h4>
          <div className="pl-6">
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
          </div>
        </div>

        {/* Question Randomization */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            Question Randomization
          </h4>
          <div className="grid grid-cols-1 gap-3 pl-6">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.shuffleQuestions}
                onChange={(e) => updateSetting('shuffleQuestions', e.target.checked)}
              />
              <span className="text-sm">Shuffle question order</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.shuffleOptions}
                onChange={(e) => updateSetting('shuffleOptions', e.target.checked)}
              />
              <span className="text-sm">Shuffle answer options</span>
            </Label>
          </div>
        </div>

        {/* Results & Review */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Results & Review
          </h4>
          <div className="grid grid-cols-1 gap-3 pl-6">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.showResultsImmediately}
                onChange={(e) => updateSetting('showResultsImmediately', e.target.checked)}
              />
              <span className="text-sm">Show results immediately after submission</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.allowReview}
                onChange={(e) => updateSetting('allowReview', e.target.checked)}
              />
              <span className="text-sm">Allow students to review answers</span>
            </Label>
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