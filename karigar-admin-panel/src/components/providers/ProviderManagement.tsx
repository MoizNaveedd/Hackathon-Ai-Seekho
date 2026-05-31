import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Ban, 
  CheckCircle, 
  X, 
  Edit3, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Star, 
  Undo2,
  Clock,
  UserCheck,
  Wrench
} from 'lucide-react';
import { ServiceProvider, Review, ProviderStatus } from '../../types';

interface ProviderManagementProps {
  providers: ServiceProvider[];
  onUpdateProviders: (updated: ServiceProvider[]) => void;
  bookings: any[];
}

export default function ProviderManagement({ providers, onUpdateProviders, bookings }: ProviderManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [minRating, setMinRating] = useState<number>(0);
  
  // Selection / Detail States
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Edit / Add Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCategory, setFormCategory] = useState<'AC Repair' | 'Plumbing' | 'Electrical' | 'Carpentry' | 'Cleaning' | 'Painting' | 'Others'>('AC Repair');
  const [formCity, setFormCity] = useState('Karachi');
  const [formRegion, setFormRegion] = useState('');
  const [formHourlyRate, setFormHourlyRate] = useState<number>(300);
  const [formAbout, setFormAbout] = useState('');

  // Selected Provider block
  const selectedProvider = useMemo(() => {
    return providers.find(p => p.id === selectedProviderId) || null;
  }, [providers, selectedProviderId]);

  // Provider's specific Bookings from master list
  const providerRecentBookings = useMemo(() => {
    if (!selectedProviderId) return [];
    return bookings.filter(b => b.providerId === selectedProviderId);
  }, [selectedProviderId, bookings]);

  // Handle suspensions/activations
  const handleUpdateStatus = (id: string, status: ProviderStatus) => {
    const updated = providers.map(p => {
      if (p.id === id) {
        return { ...p, status };
      }
      return p;
    });
    onUpdateProviders(updated);
  };

  // Soft Delete Provider
  const handleDeleteProvider = (id: string) => {
    if (confirm("Are you sure you want to delete this provider? This action soft-deletes them from active operation.")) {
      const updated = providers.filter(p => p.id !== id);
      onUpdateProviders(updated);
      if (selectedProviderId === id) {
        setSelectedProviderId(null);
      }
    }
  };

  // Open Edit Form
  const handleOpenEdit = (p: ServiceProvider) => {
    setFormName(p.name);
    setFormEmail(p.email);
    setFormPhone(p.phone);
    setFormCategory(p.category);
    setFormCity(p.city);
    setFormRegion(p.region);
    setFormHourlyRate(p.hourlyRate);
    setFormAbout(p.about);
    setIsEditing(true);
  };

  // Submit Edit Form
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId) return;

    const updated = providers.map(p => {
      if (p.id === selectedProviderId) {
        return {
          ...p,
          name: formName,
          email: formEmail,
          phone: formPhone,
          category: formCategory,
          city: formCity,
          region: formRegion,
          hourlyRate: formHourlyRate,
          about: formAbout,
        };
      }
      return p;
    });

    onUpdateProviders(updated);
    setIsEditing(false);
  };

  // Submit Add Form
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `SP-${String(providers.length + 1).padStart(3, '0')}`;
    const newProvider: ServiceProvider = {
      id: newId,
      name: formName,
      email: formEmail,
      phone: formPhone,
      category: formCategory,
      city: formCity,
      region: formRegion,
      profilePicture: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=120",
      rating: 5.0,
      reviewsCount: 0,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'Pending Verification',
      hourlyRate: formHourlyRate,
      availableSlots: ["09:00 - 12:00", "13:00 - 16:00"],
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      revenueGenerated: 0,
      completionRate: 100,
      about: formAbout || "Smart match qualified technician newly verified on the platform.",
      reviews: []
    };

    onUpdateProviders([newProvider, ...providers]);
    setIsAdding(false);
    setSelectedProviderId(newId); // open their new profile
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCategory('AC Repair');
    setFormCity('Karachi');
    setFormRegion('');
    setFormHourlyRate(300);
    setFormAbout('');
  };

  // Filtering Logic
  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
      const matchesCity = selectedCity === 'All' || p.city === selectedCity;
      const matchesRating = p.rating >= minRating;

      return matchesSearch && matchesCategory && matchesStatus && matchesCity && matchesRating;
    });
  }, [providers, searchTerm, selectedCategory, selectedStatus, selectedCity, minRating]);

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-none">Service Provider Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage partner records, review diagnostics metrics, and action compliance states.</p>
        </div>
        <button
          id="add-provider-btn"
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="bg-[#0D7377] hover:bg-[#0a5c5f] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md shadow-[#0D7377]/10 transition-all active:scale-98 shrink-0"
        >
          <Plus size={14} /> Onboard New Karigar
        </button>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Side: Search + Filter + Directory Table (2 Columns Wide on large displays) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                id="provider-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377] transition-all"
                placeholder="Search by Name, Email, Phone number, or ID..."
              />
            </div>

            {/* Quick Filters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Skill Category</label>
                <select
                  id="filter-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0D7377] bg-white font-medium"
                >
                  <option value="All">All Categories</option>
                  <option value="AC Repair">AC Repair</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Painting">Painting</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Compliance Status</label>
                <select
                  id="filter-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0D7377] bg-white font-medium"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">City Location</label>
                <select
                  id="filter-city"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0D7377] bg-white font-medium"
                >
                  <option value="All">All Cities</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Islamabad">Islamabad</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Rating Score</label>
                <select
                  id="filter-rating"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0D7377] bg-white font-medium"
                >
                  <option value="0">All Ratings</option>
                  <option value="4.5">⭐⭐⭐⭐⭐ 4.5+ Rating</option>
                  <option value="4.0">⭐⭐⭐⭐ 4.0+ Rating</option>
                  <option value="3.0">⭐⭐⭐ 3.0+ Rating</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/55">
                    <th className="p-4">Karigar ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Rating</th>
                    <th className="p-4 text-center">Bookings</th>
                    <th className="p-4 text-right">Revenue</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProviders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs font-semibold">
                        No service providers found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProviders.map(p => (
                      <tr 
                        key={p.id} 
                        id={`provider-row-${p.id}`}
                        onClick={() => setSelectedProviderId(p.id)}
                        className={`text-xs cursor-pointer group hover:bg-slate-50/80 transition-colors ${
                          selectedProviderId === p.id ? 'bg-[#0d7377]/5 hover:bg-[#0d7377]/5 border-l-2 border-l-[#0D7377]' : ''
                        }`}
                      >
                        <td className="p-4 font-bold text-slate-400">{p.id}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                              <img src={p.profilePicture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-[#0D7377] transition-colors">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{p.city}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-600">{p.category}</td>
                        <td className="p-4 text-center font-bold">
                          <span className="inline-flex items-center gap-0.5">
                            ⭐{p.rating}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-500">{p.totalBookings}</td>
                        <td className="p-4 text-right font-black text-[#0D7377]">Rs{p.revenueGenerated}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-extrabold rounded-full border ${
                            p.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : p.status === 'Suspended'
                              ? 'bg-rose-50 text-rose-750 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#0D7377] hover:bg-white transition-colors"
                              title="Edit Details"
                            >
                              <Edit3 size={11} />
                            </button>
                            {p.status === 'Suspended' ? (
                              <button
                                onClick={() => handleUpdateStatus(p.id, 'Active')}
                                className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="Activate Provider"
                              >
                                <UserCheck size={11} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(p.id, 'Suspended')}
                                className="p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 transition-colors"
                                title="Suspend Provider"
                              >
                                <Ban size={11} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteProvider(p.id)}
                              className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Soft Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Detail Panel or Add/Edit forms (1 Column wide) */}
        <div id="provider-aux-panel">
          {isAdding && (
            <div id="add-provider-panel" className="bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Onboard New Provider</h2>
                <button onClick={() => setIsAdding(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Full Legal Name</label>
                  <input required value={formName} onChange={e => setFormName(e.target.value)} type="text" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" placeholder="e.g., Harish Rawat" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Skill Category</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value as any)} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] bg-white">
                      <option value="AC Repair">AC Repair</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Carpentry">Carpentry</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Painting">Painting</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Hourly Rate (Rs)</label>
                    <input required value={formHourlyRate} onChange={e => setFormHourlyRate(Number(e.target.value))} type="number" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">City</label>
                    <input required value={formCity} onChange={e => setFormCity(e.target.value)} type="text" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Region/Area</label>
                    <input required value={formRegion} onChange={e => setFormRegion(e.target.value)} type="text" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" placeholder="e.g. Gulshan-e-Iqbal" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
                  <input required value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" placeholder="harish@gmail.com" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                  <input required value={formPhone} onChange={e => setFormPhone(e.target.value)} type="text" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" placeholder="+92 3XX XXXXXXX" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Business Portfolio / Background</label>
                  <textarea value={formAbout} onChange={e => setFormAbout(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" placeholder="Describe references, brand specialties..." />
                </div>

                <button type="submit" className="w-full py-2 bg-[#0D7377] hover:bg-[#0a5c5f] text-white font-bold rounded-lg mt-3 transition-colors">
                  Onboard & Assign Verification
                </button>
              </form>
            </div>
          )}

          {isEditing && selectedProvider && (
            <div id="edit-provider-panel" className="bg-white border border-slate-200 rounded-xl p-5 shadow-md space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Edit Karigar Profiling</h2>
                <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Full Legal Name</label>
                  <input required value={formName} onChange={e => setFormName(e.target.value)} type="text" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Skill Category</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value as any)} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] bg-white">
                      <option value="AC Repair">AC Repair</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Carpentry">Carpentry</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Painting">Painting</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Hourly Rate (Rs)</label>
                    <input required value={formHourlyRate} onChange={e => setFormHourlyRate(Number(e.target.value))} type="number" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">City</label>
                    <input required value={formCity} onChange={e => setFormCity(e.target.value)} type="text" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Region/Area</label>
                    <input required value={formRegion} onChange={e => setFormRegion(e.target.value)} type="text" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
                  <input required value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                  <input required value={formPhone} onChange={e => setFormPhone(e.target.value)} type="text" className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Business Portfolio / Background</label>
                  <textarea value={formAbout} onChange={e => setFormAbout(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none" />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="flex-grow py-2 bg-[#0D7377] hover:bg-[#0a5c5f] text-white font-bold rounded-lg transition-colors">
                    Save Changes
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-bold rounded-lg text-slate-650 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Profile Details Panel (Shown when a provider is selected & not adding/editing) */}
          {!isAdding && !isEditing && (
            selectedProvider ? (
              <div id="provider-detail-card" className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-5 animate-fade-in">
                {/* Header Profile Summary */}
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#0D7377] shrink-0">
                    <img src={selectedProvider.profilePicture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">{selectedProvider.name}</h2>
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                        selectedProvider.status === 'Active' ? 'bg-emerald-500' : selectedProvider.status === 'Suspended' ? 'bg-rose-500' : 'bg-amber-400'
                      }`} title={selectedProvider.status}></span>
                    </div>
                    <span className="text-[10px] font-bold text-[#0D7377] tracking-wider uppercase">{selectedProvider.category}</span>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">ID: {selectedProvider.id}</p>
                  </div>
                </div>

                {/* Operations Actions bar */}
                <div className="flex gap-1.5 justify-stretch text-xs">
                  <button
                    onClick={() => handleOpenEdit(selectedProvider)}
                    className="flex-1 py-1 px-2 border border-slate-200 hover:border-[#0D7377] text-slate-700 hover:text-[#0D7377] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 size={11} /> Edit Profile
                  </button>
                  {selectedProvider.status === 'Active' ? (
                    <button
                      onClick={() => handleUpdateStatus(selectedProvider.id, 'Suspended')}
                      className="flex-1 py-1 px-2 border border-rose-250 text-rose-600 hover:bg-rose-50 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Ban size={11} /> Suspend Partner
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(selectedProvider.id, 'Active')}
                      className="flex-1 py-1 px-2 border border-emerald-250 text-emerald-700 hover:bg-emerald-50 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                    >
                      <UserCheck size={11} /> Activate
                    </button>
                  )}
                </div>

                {/* Core Contact Info */}
                <div className="space-y-2 text-xs">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Contractor Profiling</h3>
                  <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center gap-2.5 text-slate-650">
                      <Phone size={12} className="text-slate-400" />
                      <span className="font-medium">{selectedProvider.phone}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-650">
                      <Mail size={12} className="text-slate-400" />
                      <span className="font-medium truncate">{selectedProvider.email}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-650">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="font-medium">{selectedProvider.region}, {selectedProvider.city}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-650">
                      <Calendar size={12} className="text-slate-400" />
                      <span className="font-medium">Registered: {selectedProvider.registrationDate}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-650">
                      <DollarSign size={13} className="text-slate-400" />
                      <span className="font-bold text-[#0D7377]">Base Rate: Rs{selectedProvider.hourlyRate} / hour</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="space-y-2 text-xs">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-sans">Marketplace Metrics</h3>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-[#0d7377]/5 rounded-lg p-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Gross Revenue</p>
                      <h4 className="text-sm font-black text-[#0D7377] mt-0.5">Rs{selectedProvider.revenueGenerated}</h4>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Success Rate</p>
                      <h4 className="text-sm font-black text-emerald-600 mt-0.5">{selectedProvider.completionRate}%</h4>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Bookings</p>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">{selectedProvider.totalBookings} slots</h4>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Feedback Core</p>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5 flex items-center justify-center gap-0.5">
                        ⭐ {selectedProvider.rating}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* About Section */}
                <div className="space-y-1.5 text-xs">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">About / Bio</h3>
                  <p className="text-slate-600 leading-relaxed italic bg-slate-50 p-2.5 rounded-lg font-medium">{selectedProvider.about}</p>
                </div>

                {/* Booking History */}
                <div className="space-y-2 text-xs">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Recent Booking Slots</h3>
                  <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
                    {providerRecentBookings.length === 0 ? (
                      <p className="text-slate-400 text-xs py-2 italic">No booking histories linked to this provider.</p>
                    ) : (
                      providerRecentBookings.map((b: any) => (
                        <div key={b.id} className="py-2 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-800 truncate w-32">{b.customerName}</p>
                            <p className="text-[9px] text-slate-450 font-semibold">{b.bookingDate} • {b.timeSlot}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-[#0D7377]" style={{ fontSize: '11px' }}>Rs{b.amount}</p>
                            <span className={`inline-block text-[8px] font-extrabold percent-span px-1.5 rounded-full ${
                              b.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                              b.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
                              b.status === 'Cancelled' ? 'bg-rose-50 text-rose-550' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reviews */}
                <div className="space-y-2 text-xs">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Customer Reviews ({selectedProvider.reviews.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedProvider.reviews.length === 0 ? (
                      <p className="text-slate-400 text-xs py-2 italic">No client reviews registered.</p>
                    ) : (
                      selectedProvider.reviews.map((r) => (
                        <div key={r.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{r.customerName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{r.date}</span>
                          </div>
                          <div className="text-amber-500 font-bold select-none text-[10px] mt-0.5">{"⭐".repeat(r.rating)}</div>
                          <p className="text-slate-600 mt-1 italic leading-relaxed text-[11px]">"{r.comment}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-semibold h-96 flex flex-col items-center justify-center">
                <Wrench size={32} className="text-slate-300 mb-2.5" />
                Select a service provider to inspect live operational telemetry details, reviews, and transaction records.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
