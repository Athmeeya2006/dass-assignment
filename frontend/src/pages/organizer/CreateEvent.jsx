import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, ArrowRight, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

const genId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
const FIELD_TYPES = ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number'];

const CreateEvent = () => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', description: '', type: 'Normal', eligibility: '', registrationDeadline: '',
    startDate: '', endDate: '', venue: '', registrationLimit: '', fee: 0,
    tags: '', teamRegistration: false, teamSize: 2,
  });
  const [customForm, setCustomForm] = useState([]);
  const [variants, setVariants] = useState([]);
  const [purchaseLimit, setPurchaseLimit] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData({ ...formData, [name]: inputType === 'checkbox' ? checked : value });
  };

  const addField = () => setCustomForm([...customForm, { fieldId: genId(), label: '', type: 'text', required: false, options: [], order: customForm.length }]);
  const updateField = (idx, key, value) => { const u = [...customForm]; u[idx] = { ...u[idx], [key]: value }; setCustomForm(u); };
  const removeField = (idx) => setCustomForm(customForm.filter((_, i) => i !== idx));
  const moveField = (idx, dir) => {
    const u = [...customForm]; const t = dir === 'up' ? idx - 1 : idx + 1;
    if (t < 0 || t >= u.length) return;
    [u[idx], u[t]] = [u[t], u[idx]];
    setCustomForm(u.map((f, i) => ({ ...f, order: i })));
  };

  const addVariant = () => setVariants([...variants, { variantId: genId(), size: '', color: '', stock: 0, price: 0 }]);
  const updateVariant = (idx, key, value) => { const u = [...variants]; u[idx] = { ...u[idx], [key]: value }; setVariants(u); };
  const removeVariant = (idx) => setVariants(variants.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        registrationLimit: parseInt(formData.registrationLimit) || null,
        fee: parseFloat(formData.fee) || 0,
        ...(formData.type === 'Normal' && { customForm, teamRegistration: formData.teamRegistration, ...(formData.teamRegistration && { teamSize: parseInt(formData.teamSize) || 2 }) }),
        ...(formData.type === 'Merchandise' && { merchandiseDetails: { variants, purchaseLimitPerParticipant: purchaseLimit } }),
      };
      await axiosInstance.post('/organizer/create-event', payload);
      toast.success('Event created as draft!');
      navigate('/organizer/dashboard');
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to create event'); }
    finally { setLoading(false); }
  };

  const totalSteps = formData.type === 'Normal' ? 3 : 2;

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-surface border border-border overflow-hidden">
          {/* Header */}
          <div className="mesh-bg p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="h-[2px] w-full bg-accent-primary animate-scanLine" />
            </div>
            <div className="relative z-10">
              <h1 className="font-display text-3xl tracking-wider text-text-primary">CREATE EVENT</h1>
              <p className="font-mono text-[11px] text-text-muted mt-1">Step {step} of {totalSteps}</p>
              <div className="flex mt-4 gap-1">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                  <div key={s} className={`h-[3px] flex-1 transition-all ${step >= s ? 'bg-accent-primary' : 'bg-border'}`} />
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Step 1 */}
            {step === 1 && (
              <>
                <h2 className="font-heading text-base text-text-primary">Basic Information</h2>
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Event Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-brutal w-full" required />
                </div>
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
                    className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary transition-colors resize-none placeholder:text-text-muted" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Event Type</label>
                    <select name="type" value={formData.type} onChange={handleChange}
                      className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary appearance-none cursor-pointer">
                      <option value="Normal">Normal Event</option>
                      <option value="Merchandise">Merchandise Event</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Eligibility</label>
                    <select name="eligibility" value={formData.eligibility} onChange={handleChange}
                      className="w-full font-mono text-[12px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary appearance-none cursor-pointer">
                      <option value="">Open to All</option>
                      <option value="IIIT Only">IIIT Only</option>
                      <option value="Non-IIIT Only">Non-IIIT Only</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[['startDate', 'Start Date *'], ['endDate', 'End Date *'], ['registrationDeadline', 'Reg. Deadline *']].map(([key, label]) => (
                    <div key={key}>
                      <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">{label}</label>
                      <input type="datetime-local" name={key} value={formData[key]} onChange={handleChange}
                        className="w-full font-mono text-[11px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary" required />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Venue</label>
                    <input type="text" name="venue" value={formData.venue} onChange={handleChange} className="input-brutal w-full" />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Reg. Limit</label>
                    <input type="number" name="registrationLimit" value={formData.registrationLimit} onChange={handleChange} className="input-brutal w-full" />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Fee (₹)</label>
                    <input type="number" name="fee" value={formData.fee} onChange={handleChange} className="input-brutal w-full" min={0} step={0.01} />
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Tags (comma separated)</label>
                  <input type="text" name="tags" value={formData.tags} onChange={handleChange} className="input-brutal w-full" />
                </div>
                {formData.type === 'Normal' && (
                  <div className="border border-accent-primary/30 bg-accent-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading text-sm text-text-primary">Team Registration</p>
                        <p className="font-mono text-[10px] text-text-muted">Allow participants to form teams</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="teamRegistration" checked={formData.teamRegistration} onChange={handleChange} className="sr-only peer" />
                        <div className="w-10 h-5 bg-border peer-checked:bg-accent-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-ink after:w-4 after:h-4 peer-checked:after:translate-x-5 after:transition-all" />
                      </label>
                    </div>
                    {formData.teamRegistration && (
                      <div>
                        <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Max Team Size</label>
                        <input type="number" name="teamSize" min={2} max={10} value={formData.teamSize} onChange={handleChange} className="input-brutal w-32" />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <button type="button" onClick={() => setStep(2)} className="btn-brutal btn-primary flex items-center gap-1">
                    Next <ArrowRight size={12} />
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Form Builder (Normal) */}
            {step === 2 && formData.type === 'Normal' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base text-text-primary">Registration Form Builder</h2>
                  <button type="button" onClick={addField} className="btn-brutal btn-ghost !text-[10px] !py-1 !px-3 flex items-center gap-1">
                    <Plus size={10} /> Add Field
                  </button>
                </div>
                {customForm.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border">
                    <p className="font-mono text-[12px] text-text-muted">No fields added. Click "Add Field" to build your form.</p>
                  </div>
                )}
                <div className="space-y-3">
                  {customForm.map((field, idx) => (
                    <div key={field.fieldId} className="border border-border bg-ink p-4">
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <input type="text" placeholder="Field Label *" value={field.label}
                          onChange={(e) => updateField(idx, 'label', e.target.value)} className="col-span-2 input-brutal" />
                        <select value={field.type} onChange={(e) => updateField(idx, 'type', e.target.value)}
                          className="font-mono text-[11px] bg-transparent border-b-2 border-border text-text-primary py-2 focus:outline-none focus:border-accent-primary appearance-none cursor-pointer">
                          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      {['dropdown', 'checkbox', 'radio'].includes(field.type) && (
                        <div className="mb-3">
                          <input type="text" placeholder="Options (comma separated)" value={field.options?.join(',')}
                            onChange={(e) => updateField(idx, 'options', e.target.value.split(',').map((o) => o.trim()))} className="input-brutal w-full" />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 font-mono text-[11px] text-text-secondary cursor-pointer">
                          <input type="checkbox" checked={field.required} onChange={(e) => updateField(idx, 'required', e.target.checked)} className="accent-[#E8FF00]" />
                          Required
                        </label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => moveField(idx, 'up')} className="text-text-muted hover:text-accent-primary"><ChevronUp size={14} /></button>
                          <button type="button" onClick={() => moveField(idx, 'down')} className="text-text-muted hover:text-accent-primary"><ChevronDown size={14} /></button>
                          <button type="button" onClick={() => removeField(idx)} className="font-mono text-[10px] text-error hover:underline uppercase tracking-wider">Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="btn-brutal btn-ghost flex items-center gap-1"><ArrowLeft size={12} /> Back</button>
                  <button type="button" onClick={() => setStep(3)} className="btn-brutal btn-primary flex items-center gap-1">Next <ArrowRight size={12} /></button>
                </div>
              </>
            )}

            {/* Step 2: Variants (Merchandise) */}
            {step === 2 && formData.type === 'Merchandise' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base text-text-primary">Merchandise Variants</h2>
                  <button type="button" onClick={addVariant} className="btn-brutal btn-ghost !text-[10px] !py-1 !px-3 flex items-center gap-1">
                    <Plus size={10} /> Add Variant
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.15em] text-text-muted mb-1">Purchase Limit Per Participant</label>
                  <input type="number" min={1} value={purchaseLimit} onChange={(e) => setPurchaseLimit(Number(e.target.value))} className="input-brutal w-32" />
                </div>
                <div className="space-y-3">
                  {variants.map((v, idx) => (
                    <div key={v.variantId} className="border border-border bg-ink p-3 grid grid-cols-5 gap-2 items-center">
                      {[['size', 'Size'], ['color', 'Color']].map(([k, p]) => (
                        <input key={k} type="text" placeholder={p} value={v[k]} onChange={(e) => updateVariant(idx, k, e.target.value)} className="input-brutal" />
                      ))}
                      <input type="number" placeholder="Stock" value={v.stock} min={0} onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))} className="input-brutal" />
                      <input type="number" placeholder="Price ₹" value={v.price} min={0} onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))} className="input-brutal" />
                      <button type="button" onClick={() => removeVariant(idx)} className="font-mono text-[10px] text-error hover:underline uppercase tracking-wider">Remove</button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="btn-brutal btn-ghost flex items-center gap-1"><ArrowLeft size={12} /> Back</button>
                  <button type="submit" disabled={loading} className="btn-brutal btn-primary">{loading ? 'Creating...' : 'Create Event (Draft)'}</button>
                </div>
              </>
            )}

            {/* Step 3: Review */}
            {step === 3 && formData.type === 'Normal' && (
              <>
                <h2 className="font-heading text-base text-text-primary">Review & Create</h2>
                <div className="bg-ink border border-border p-4 space-y-2">
                  {[
                    ['Name', formData.name], ['Type', formData.type], ['Start', formData.startDate], ['End', formData.endDate],
                    ['Deadline', formData.registrationDeadline], ['Fee', `₹${formData.fee || 0}`],
                    ['Reg. Limit', formData.registrationLimit || 'Unlimited'], ['Form Fields', customForm.length],
                    ['Team Registration', formData.teamRegistration ? `Yes (max ${formData.teamSize})` : 'No'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{k}</span>
                      <span className="font-mono text-[12px] text-text-primary">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(2)} className="btn-brutal btn-ghost flex items-center gap-1"><ArrowLeft size={12} /> Back</button>
                  <button type="submit" disabled={loading} className="btn-brutal btn-primary">{loading ? 'Creating...' : 'Create Event (Draft)'}</button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
