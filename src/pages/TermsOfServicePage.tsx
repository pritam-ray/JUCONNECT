import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, Users, Shield, AlertTriangle, Scale, Ban, Crown } from 'lucide-react'

const TermsOfServicePage: React.FC = () => {
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
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
                <p className="text-gray-600">Last updated: August 21, 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Agreement */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Scale className="h-6 w-6 text-blue-600" />
              Agreement to Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing and using JU CONNECTS ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. These Terms of Service ("Terms") govern your use of our educational content sharing platform operated by JECRC University Connect ("we," "us," or "our").
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <p className="text-blue-700 font-medium">
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </div>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Users className="h-6 w-6 text-green-600" />
              Eligibility
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              JU CONNECTS is intended for educational purposes and is available to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Current students of JECRC University and affiliated institutions</li>
              <li>Faculty members and academic staff</li>
              <li>Alumni and educational researchers</li>
              <li>Individuals aged 18 years or older</li>
              <li>Users with legitimate educational interests</li>
            </ul>
            <p className="text-gray-600 mt-4">
              By registering, you represent that you meet these eligibility requirements and that all information provided is accurate and truthful.
            </p>
          </section>

          {/* Account Responsibilities */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-purple-600" />
              Account Responsibilities
            </h2>
            <div className="space-y-4">
              <p className="text-gray-600">When you create an account, you agree to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Use your real name and authentic information</li>
                <li>Maintain one account per person</li>
              </ul>
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <p className="text-yellow-700">
                  <strong>Important:</strong> You are responsible for maintaining the confidentiality of your account credentials.
                </p>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Acceptable Use Policy</h2>
            <div className="space-y-4">
              <p className="text-gray-600 font-medium">You may use JU CONNECTS to:</p>
              <ul className="list-disc list-inside text-green-600 space-y-1">
                <li>Share educational content and academic resources</li>
                <li>Collaborate on educational projects and research</li>
                <li>Participate in academic discussions and forums</li>
                <li>Access and download shared educational materials</li>
                <li>Connect with fellow students and educators</li>
              </ul>
              
              <p className="text-gray-600 font-medium mt-6">You may NOT use JU CONNECTS to:</p>
              <ul className="list-disc list-inside text-red-600 space-y-1">
                <li>Upload copyrighted material without permission</li>
                <li>Share inappropriate, offensive, or harmful content</li>
                <li>Engage in harassment, bullying, or discriminatory behavior</li>
                <li>Spam, advertise, or promote commercial activities</li>
                <li>Attempt to hack, disrupt, or damage the platform</li>
                <li>Create fake accounts or impersonate others</li>
                <li>Share personal information of others without consent</li>
                <li>Use automated tools to scrape or download content</li>
              </ul>
            </div>
          </section>

          {/* Content Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Content Guidelines</h2>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Content You Upload</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Must be educational, academic, or research-related</li>
                <li>Should be original work or properly attributed</li>
                <li>Must not violate copyright or intellectual property rights</li>
                <li>Should be appropriate for an academic environment</li>
                <li>Must comply with applicable laws and regulations</li>
              </ul>
              
              <h3 className="font-semibold text-gray-900 mt-6">Content Moderation</h3>
              <p className="text-gray-600">
                All uploaded content is subject to review and approval by our moderation team. We reserve the right to remove content that violates these guidelines or is deemed inappropriate for our educational platform.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Crown className="h-6 w-6 text-yellow-600" />
              Intellectual Property Rights
            </h2>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Your Content</h3>
              <p className="text-gray-600">
                You retain ownership of content you create and upload to JU CONNECTS. By uploading content, you grant us a non-exclusive, worldwide license to host, display, and distribute your content on the platform for educational purposes.
              </p>
              
              <h3 className="font-semibold text-gray-900">Platform Content</h3>
              <p className="text-gray-600">
                The JU CONNECTS platform, including its design, features, and functionality, is owned by us and protected by copyright and other intellectual property laws.
              </p>
              
              <h3 className="font-semibold text-gray-900">Respect for Others' Rights</h3>
              <p className="text-gray-600">
                You must respect the intellectual property rights of others. If you believe content infringes your rights, please contact us immediately through our reporting system.
              </p>
            </div>
          </section>

          {/* Privacy and Data */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy and Data Usage</h2>
            <p className="text-gray-600 leading-relaxed">
              Your privacy is important to us. Our collection and use of personal information is governed by our <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference. By using JU CONNECTS, you also consent to our Privacy Policy.
            </p>
          </section>

          {/* Prohibited Activities */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <Ban className="h-6 w-6 text-red-600" />
              Prohibited Activities
            </h2>
            <div className="space-y-4">
              <p className="text-gray-600">The following activities are strictly prohibited:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-red-700 mb-2">Security Violations</h4>
                  <ul className="text-red-600 text-sm space-y-1">
                    <li>• Attempting to breach security measures</li>
                    <li>• Accessing others' accounts without permission</li>
                    <li>• Introducing malware or viruses</li>
                    <li>• Reverse engineering the platform</li>
                  </ul>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-700 mb-2">Content Violations</h4>
                  <ul className="text-orange-600 text-sm space-y-1">
                    <li>• Uploading illegal or harmful content</li>
                    <li>• Sharing copyrighted material illegally</li>
                    <li>• Posting spam or unwanted content</li>
                    <li>• Misrepresenting content ownership</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Enforcement */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              Enforcement and Consequences
            </h2>
            <div className="space-y-4">
              <p className="text-gray-600">Violations of these Terms may result in:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Warning notifications</li>
                <li>Temporary suspension of account privileges</li>
                <li>Removal of violating content</li>
                <li>Permanent account termination</li>
                <li>Legal action in severe cases</li>
              </ul>
              <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                <p className="text-orange-700">
                  We reserve the right to investigate violations and take appropriate action at our discretion.
                </p>
              </div>
            </div>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Disclaimers and Limitations</h2>
            <div className="space-y-4">
              <p className="text-gray-600">JU CONNECTS is provided "as is" without warranties of any kind. We do not guarantee:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Uninterrupted or error-free service</li>
                <li>Accuracy or reliability of content</li>
                <li>Security against all threats</li>
                <li>Compatibility with all devices or browsers</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Your use of the platform is at your own risk. We are not liable for any damages arising from your use of JU CONNECTS.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may modify these Terms at any time. Significant changes will be announced through the platform or via email. Your continued use after changes indicates acceptance of the new Terms. If you disagree with changes, you must stop using the platform.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              Either party may terminate your account at any time. Upon termination, your right to use the platform ceases immediately. We may retain certain information as required by law or for legitimate business purposes.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Questions About These Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-gray-600">
              <p><strong>Email:</strong> jecrcuconnects@gmail.com</p>
              <p><strong>Support:</strong> Visit our <Link to="/contact" className="text-primary-600 hover:underline">Contact Us</Link> page</p>
              <p><strong>Address:</strong> JECRC University, Jaipur, Rajasthan 302022, India</p>
              <p><strong>Made by:</strong> Pritam Ray (@impritamray)</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TermsOfServicePage
