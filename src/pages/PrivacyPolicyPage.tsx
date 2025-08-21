import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, Eye, Users, Database, Bell, Trash2 } from 'lucide-react'

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-green-100 rounded-xl">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
                <p className="text-gray-600">Last updated: August 21, 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Policy Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Eye className="h-6 w-6 text-primary-600" />
              Introduction
            </h2>
            <p className="text-gray-600 leading-relaxed">
              JU Connect ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our educational content sharing platform. By using JU Connect, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-600" />
              Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Email address and username</li>
                  <li>Full name and profile information</li>
                  <li>Academic institution details (if provided)</li>
                  <li>Profile picture (optional)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Content Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Files and documents you upload</li>
                  <li>Messages and chat communications</li>
                  <li>Comments and feedback on content</li>
                  <li>Usage patterns and preferences</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Technical Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Login timestamps and activity logs</li>
                  <li>Cookies and local storage data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Users className="h-6 w-6 text-purple-600" />
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>To provide and maintain our educational platform services</li>
              <li>To facilitate content sharing and academic collaboration</li>
              <li>To enable messaging and communication features</li>
              <li>To moderate content and ensure community safety</li>
              <li>To send important notifications about your account or content</li>
              <li>To analyze usage patterns and improve our services</li>
              <li>To prevent fraud and maintain platform security</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information Sharing and Disclosure</h2>
            <div className="space-y-4">
              <p className="text-gray-600">We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li><strong>With Your Consent:</strong> When you explicitly agree to share information</li>
                <li><strong>Public Content:</strong> Content you upload is visible to other platform users</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Service Providers:</strong> With trusted partners who help operate our platform</li>
                <li><strong>Safety:</strong> To prevent harm or illegal activities</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-green-600" />
              Data Security
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and monitoring</li>
              <li>Secure authentication and access controls</li>
              <li>Automatic logout for inactive sessions</li>
              <li>Regular backup and disaster recovery procedures</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights and Choices</h2>
            <div className="space-y-4">
              <p className="text-gray-600">You have the following rights regarding your personal information:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from notifications</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use cookies and similar technologies to enhance your experience:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Essential cookies for platform functionality</li>
              <li>Preference cookies to remember your settings</li>
              <li>Analytics cookies to understand usage patterns</li>
              <li>Session cookies for authentication</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You can control cookie settings through your browser preferences.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Trash2 className="h-6 w-6 text-red-600" />
              Data Retention
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your information for as long as necessary to provide our services and comply with legal obligations:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mt-4">
              <li>Account information: Until account deletion</li>
              <li>Uploaded content: As long as publicly available</li>
              <li>Messages: 2 years or until deletion request</li>
              <li>Logs and analytics: 1 year for security purposes</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              JU Connect is designed for university students and educators (18+). We do not knowingly collect personal information from children under 18. If we discover that a child under 18 has provided personal information, we will delete it immediately.
            </p>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Bell className="h-6 w-6 text-yellow-600" />
              Updates to This Policy
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification. Your continued use of JU Connect after changes indicates acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or how we handle your information, please contact us:
            </p>
            <div className="space-y-2 text-gray-600">
              <p><strong>Email:</strong> privacy@juconnect.edu</p>
              <p><strong>Support:</strong> Visit our <Link to="/contact" className="text-primary-600 hover:underline">Contact Us</Link> page</p>
              <p><strong>Address:</strong> JECRC University, Jaipur, Rajasthan 302022, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicyPage
