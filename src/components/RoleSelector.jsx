import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserGroupIcon, 
  BuildingOfficeIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

const RoleSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-ink mb-4">
            Collaborative Workspace System
          </h1>
          <p className="text-xl text-dim mb-2">
            Choose your role to access the platform
          </p>
          <p className="text-sm text-dim">
            Testing environment for PM-Vendor collaboration
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* PM Card */}
          <div className="bg-surface rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-line">
            <div className="text-center">
              <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <BuildingOfficeIcon className="h-8 w-8 text-info" />
              </div>
              
              <h3 className="text-2xl font-bold text-ink mb-4">Project Manager</h3>
              
              <p className="text-dim mb-6 leading-relaxed">
                Create projects, invite vendors, manage collaborative workspaces, 
                and oversee project execution with full administrative control.
              </p>
              
              <div className="space-y-2 mb-8 text-sm text-dim">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Create & manage projects</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Invite & manage vendors</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Full workspace permissions</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Real-time collaboration</span>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-info text-white py-3 px-6 rounded-lg font-medium hover:bg-info transition-colors flex items-center justify-center space-x-2"
              >
                <span>Login as PM</span>
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Vendor Card */}
          <div className="bg-surface rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-line">
            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserGroupIcon className="h-8 w-8 text-success" />
              </div>
              
              <h3 className="text-2xl font-bold text-ink mb-4">Vendor</h3>
              
              <p className="text-dim mb-6 leading-relaxed">
                Receive project invitations, collaborate in shared workspaces, 
                manage leads, and deliver project components with role-based access.
              </p>
              
              <div className="space-y-2 mb-8 text-sm text-dim">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Receive project invitations</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Collaborative workspaces</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Lead management</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Progress tracking</span>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-success text-white py-3 px-6 rounded-lg font-medium hover:bg-success transition-colors flex items-center justify-center space-x-2"
              >
                <span>Login as Vendor</span>
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-surface rounded-xl shadow-lg p-6 border border-line">
          <h4 className="text-lg font-semibold text-ink mb-4 text-center">
            Collaborative Features
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="text-center">
              <div className="w-10 h-10 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="h-5 w-5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h5 className="font-medium text-ink mb-1">Real-time Communication</h5>
              <p className="text-dim">Live messaging and notifications</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h5 className="font-medium text-ink mb-1">Role-Based Access</h5>
              <p className="text-dim">Secure permissions management</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h5 className="font-medium text-ink mb-1">Shared Workspaces</h5>
              <p className="text-dim">Collaborative project canvases</p>
            </div>
          </div>
        </div>

        {/* Testing Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-warning/10 border border-warning/20 rounded-lg text-warning text-sm">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This is a testing environment. Sample accounts are pre-configured for demonstration.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
