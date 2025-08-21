import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MessageCircle, Phone, MapPin, Send, Clock, HelpCircle } from 'lucide-react'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const ContactUsPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'content', label: 'Content Issues' },
    { value: 'account', label: 'Account Problems' },
    { value: 'privacy', label: 'Privacy Concerns' },
    { value: 'feedback', label: 'Feedback & Suggestions' }
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsSubmitted(true)
    setIsSubmitting(false)
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'general',
        message: ''
      })
    }, 3000)
  }

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get help via email',
      contact: 'support@juconnect.edu',
      response: 'Response within 24 hours'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat with our support team',
      contact: 'Available 9 AM - 6 PM',
      response: 'Instant response'
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Call for urgent issues',
      contact: '+91 33 2414-6666',
      response: 'Mon-Fri, 9 AM - 5 PM'
    }
  ]

  const faqItems = [
    {
      question: 'How quickly do you respond to support requests?',
      answer: 'We aim to respond to all inquiries within 24 hours during business days.'
    },
    {
      question: 'Can I get help with technical issues?',
      answer: 'Yes! Our technical support team can help with platform issues, login problems, and more.'
    },
    {
      question: 'How do I report inappropriate content?',
      answer: 'Use the report button on any content, or contact us directly with details.'
    },
    {
      question: 'Can you help with account recovery?',
      answer: 'Absolutely. Contact us with your account details and we\'ll help you regain access.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
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
              <div className="p-3 bg-primary-100 rounded-xl">
                <MessageCircle className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
                <p className="text-gray-600">We're here to help! Reach out with any questions or concerns.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Send us a Message</h2>
              
              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600">Thank you for contacting us. We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {categories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Brief description of your inquiry"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      placeholder="Please provide as much detail as possible about your inquiry..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Methods */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Other Ways to Reach Us</h3>
              <div className="space-y-4">
                {contactMethods.map((method, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <method.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{method.title}</h4>
                      <p className="text-sm text-gray-600">{method.description}</p>
                      <p className="text-sm font-medium text-primary-600">{method.contact}</p>
                      <p className="text-xs text-gray-500">{method.response}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Office Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-600" />
                Our Office
              </h3>
              <div className="space-y-3 text-gray-600">
                <p><strong>JU Connect Support Center</strong></p>
                <p>Jadavpur University<br />188, Raja S.C. Mallick Rd<br />Kolkata, West Bengal 700032<br />India</p>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-primary-600" />
                    <span className="font-medium">Office Hours</span>
                  </div>
                  <p className="text-sm">Monday - Friday: 9:00 AM - 6:00 PM</p>
                  <p className="text-sm">Saturday: 10:00 AM - 4:00 PM</p>
                  <p className="text-sm">Sunday: Closed</p>
                </div>
              </div>
            </div>

            {/* Quick FAQ */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary-600" />
                Quick FAQ
              </h3>
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <details key={index} className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-900 hover:text-primary-600">
                      {item.question}
                      <span className="ml-2 transform group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                  </details>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  to="/help"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Full Help Center →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactUsPage
