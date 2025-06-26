'use client';

import React from 'react';
import { 
  Activity, AlertCircle, CheckCircle, Clock, Code, 
  FileText, GitCommit, Package, RefreshCw, TestTube,
  TrendingDown, TrendingUp, XCircle, Zap
} from 'lucide-react';
import { useLiveProjectData } from '@/hooks/useLiveProjectData';

const LiveProjectStatus: React.FC = () => {
  const { 
    metrics, 
    recommendations, 
    issues, 
    isLoading, 
    isLive, 
    lastUpdated, 
    error,
    forceRefresh,
    isStale
  } = useLiveProjectData(30000); // Refresh every 30 seconds

  const getBuildStatusIcon = () => {
    switch (metrics.buildStatus) {
      case 'passing':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failing':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTestCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'text-green-600';
    if (coverage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">Failed to load project state: {error}</span>
          <button
            onClick={forceRefresh}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 ${isLive ? 'text-green-600' : 'text-gray-400'}`}>
              <Activity className={`h-5 w-5 ${isLive ? 'animate-pulse' : ''}`} />
              <span className="font-semibold">
                {isLive ? 'LIVE PROJECT MONITORING' : 'OFFLINE'}
              </span>
            </div>
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last scan: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={forceRefresh}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
              isLoading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Scanning...' : 'Force Scan'}</span>
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Build Status</p>
                <p className="text-lg font-semibold capitalize">{metrics.buildStatus}</p>
              </div>
              {getBuildStatusIcon()}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Test Coverage</p>
                <p className={`text-lg font-semibold ${getTestCoverageColor(metrics.testCoverage)}`}>
                  {metrics.testCoverage}%
                </p>
              </div>
              <TestTube className="h-5 w-5 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Type Errors</p>
                <p className={`text-lg font-semibold ${metrics.typeErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.typeErrors}
                </p>
              </div>
              <Code className="h-5 w-5 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">TODOs</p>
                <p className={`text-lg font-semibold ${metrics.todoCount > 20 ? 'text-yellow-600' : 'text-gray-700'}`}>
                  {metrics.todoCount}
                </p>
              </div>
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Overall Completion</span>
            <span className="font-semibold">{metrics.overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${metrics.overallProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{metrics.completedTasks} completed</span>
            <span>{metrics.inProgressTasks} in progress</span>
            <span>{metrics.blockedTasks} blocked</span>
          </div>
        </div>
      </div>

      {/* Critical Issues */}
      {issues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="flex items-center space-x-2 text-lg font-semibold text-red-900 mb-4">
            <AlertCircle className="h-5 w-5" />
            <span>Critical Issues Detected</span>
          </h3>
          <div className="space-y-3">
            {issues.map((issue, index) => (
              <div key={index} className="flex items-start space-x-3 bg-white rounded p-3 border border-red-200">
                <div className={`mt-0.5 ${
                  issue.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {issue.type === 'build-failure' && <Package className="h-5 w-5" />}
                  {issue.type === 'test-failure' && <TestTube className="h-5 w-5" />}
                  {issue.type === 'security' && <AlertCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{issue.description}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Detected at {new Date(issue.detectedAt).toLocaleTimeString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  issue.severity === 'critical' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {issue.severity.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="flex items-center space-x-2 text-lg font-semibold text-blue-900 mb-4">
            <Zap className="h-5 w-5" />
            <span>AI-Powered Recommendations</span>
          </h3>
          <div className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <p className="text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Codebase Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Codebase Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Files</p>
            <p className="text-xl font-semibold">{metrics.totalFiles.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Lines of Code</p>
            <p className="text-xl font-semibold">{metrics.totalLines.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Auto-detected Tasks</p>
            <p className="text-xl font-semibold">{metrics.totalTasks}</p>
          </div>
          <div>
            <p className="text-gray-600">Critical Tasks</p>
            <p className="text-xl font-semibold text-red-600">{metrics.criticalTasks}</p>
          </div>
        </div>
      </div>

      {/* Live Indicator */}
      {isStale && (
        <div className="flex items-center justify-center space-x-2 text-yellow-600 text-sm">
          <Clock className="h-4 w-4" />
          <span>Data may be stale. Next auto-refresh in progress...</span>
        </div>
      )}
    </div>
  );
};

export default LiveProjectStatus;