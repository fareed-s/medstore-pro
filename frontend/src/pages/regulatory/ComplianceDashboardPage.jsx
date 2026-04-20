import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { HiOutlineShieldCheck, HiOutlineExclamation, HiOutlineDocumentText, HiOutlineTrash, HiOutlineClipboardList } from 'react-icons/hi';

export default function ComplianceDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/regulatory/dashboard').then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Drug Regulatory Compliance</h1>
      <p className="text-gray-500 text-sm mb-6">Schedule H/H1/X tracking, narcotics register, licenses</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center"><HiOutlineShieldCheck className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-gray-500">Controlled Drugs</p><p className="text-xl font-heading font-bold">{data?.controlledMedicines || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center"><HiOutlineExclamation className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-gray-500">Schedule-X (Narcotic)</p><p className="text-xl font-heading font-bold text-red-600">{data?.scheduleXCount || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center"><HiOutlineClipboardList className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Register Entries (This Month)</p><p className="text-xl font-heading font-bold">{data?.recentEntries || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center"><HiOutlineDocumentText className="w-5 h-5 text-orange-600" /></div>
          <div><p className="text-xs text-gray-500">Licenses Expiring</p><p className="text-xl font-heading font-bold text-orange-600">{data?.dlExpiring || 0}</p></div>
        </div>
      </div>

      {/* Schedule breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card border-l-4 border-amber-400">
          <h3 className="font-heading font-semibold text-amber-700">Schedule H</h3>
          <p className="text-3xl font-heading font-bold text-gray-900 mt-1">{data?.scheduleHCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Prescription required, patient details logged</p>
        </div>
        <div className="card border-l-4 border-orange-500">
          <h3 className="font-heading font-semibold text-orange-700">Schedule H1</h3>
          <p className="text-3xl font-heading font-bold text-gray-900 mt-1">{data?.scheduleH1Count || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Prescription + mandatory register entry</p>
        </div>
        <div className="card border-l-4 border-red-500">
          <h3 className="font-heading font-semibold text-red-700">Schedule X (Narcotic)</h3>
          <p className="text-3xl font-heading font-bold text-gray-900 mt-1">{data?.scheduleXCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Prescription + register + government reporting</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/regulatory/register', label: 'Controlled Drug Register', desc: 'View/add entries for H/H1/X drugs', icon: HiOutlineClipboardList, color: 'text-primary-600 bg-primary-50' },
          { to: '/regulatory/licenses', label: 'Drug Licenses', desc: 'Track store & supplier DL expiry', icon: HiOutlineDocumentText, color: 'text-blue-600 bg-blue-50' },
          { to: '/regulatory/destruction', label: 'Expiry Destruction', desc: 'Register of destroyed expired drugs', icon: HiOutlineTrash, color: 'text-red-600 bg-red-50' },
          { to: '/regulatory/narcotic-report', label: 'Narcotic Report', desc: 'Monthly report for drug inspector', icon: HiOutlineShieldCheck, color: 'text-amber-600 bg-amber-50' },
        ].map(link => (
          <Link key={link.to} to={link.to} className="card hover:shadow-cardHover transition-shadow group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${link.color}`}>
              <link.icon className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{link.label}</h3>
            <p className="text-xs text-gray-400 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
