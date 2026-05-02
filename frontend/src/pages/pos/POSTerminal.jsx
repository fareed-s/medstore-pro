import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { confirmDanger } from '../../utils/swal';
import { HiOutlineSearch, HiOutlineTrash, HiOutlinePlus, HiOutlineMinus, HiOutlinePause, HiOutlinePlay, HiOutlineX, HiOutlinePrinter, HiOutlineExclamation, HiOutlineSwitchHorizontal } from 'react-icons/hi';

const PAY_METHODS = [{key:'cash',label:'Cash',icon:'💵'},{key:'card',label:'Card',icon:'💳'},{key:'upi',label:'UPI',icon:'📱'},{key:'credit',label:'Credit',icon:'📝'}];
const CAT_TABS = ['All','Tablet','Capsule','Syrup','Injection','Cream/Ointment','Drops','Inhaler','Sachet','Gel'];

export default function POSTerminal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCat, setSelectedCat] = useState('All');
  const [tiles, setTiles] = useState([]);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [tilesPage, setTilesPage] = useState(1);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [overallDiscPct, setOverallDiscPct] = useState(0);
  const [overallDiscAmt, setOverallDiscAmt] = useState(0);
  const [discMode, setDiscMode] = useState('pct'); // 'pct' or 'amt'
  const [billName, setBillName] = useState('');
  const [payments, setPayments] = useState([{method:'cash',amount:'',reference:''}]);
  const [heldBills, setHeldBills] = useState([]);
  const [showHeld, setShowHeld] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [interactions, setInteractions] = useState(null);
  const [showInteractions, setShowInteractions] = useState(false);
  const [substitutes, setSubstitutes] = useState([]);
  const [showSubs, setShowSubs] = useState(false);
  const [subFor, setSubFor] = useState(null);

  useEffect(() => { fetchHeldBills(); fetchTiles(); fetchStore(); }, []);
  useEffect(() => { fetchTiles(); }, [selectedCat, tilesPage]);
  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    const h = e => {
      if(e.key==='F2'){e.preventDefault();searchRef.current?.focus();}
      if(e.key==='F5'){e.preventDefault();holdBill();}
      if(e.key==='F10'){e.preventDefault();completeSale();}
      if(e.key==='Escape'){setShowReceipt(false);setShowHeld(false);setShowInteractions(false);setShowSubs(false);}
    };
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[cart,payments]);

  const fetchStore = async()=>{try{const{data}=await API.get('/stores');setStoreInfo(data.data);}catch{}};
  const fetchHeldBills = async()=>{try{const{data}=await API.get('/sales/held');setHeldBills(data.data);}catch{}};
  const fetchTiles = async()=>{
    setTilesLoading(true);
    try{
      // POS only ever shows medicines that are actually sellable — inStock=true
      // hides anything with currentStock <= 0 at the database level.
      const p=new URLSearchParams({page:tilesPage,limit:40,inStock:'true'});
      if(selectedCat!=='All')p.set('category',selectedCat);
      const{data}=await API.get(`/medicines?${p}`);setTiles(data.data);
    }catch{}finally{setTilesLoading(false);}
  };

  const searchMeds = useCallback(async q=>{
    if(!q||q.length<1){setSearchResults([]);return;}
    setSearching(true);
    try{const{data}=await API.get(`/medicines/search?q=${encodeURIComponent(q)}&limit=10&inStock=true`);setSearchResults(data.data);}catch{}finally{setSearching(false);}
  },[]);
  useEffect(()=>{const t=setTimeout(()=>searchMeds(searchQuery),200);return()=>clearTimeout(t);},[searchQuery,searchMeds]);

  useEffect(()=>{
    if(custSearch.length<2){setCustResults([]);return;}
    const t=setTimeout(async()=>{try{const{data}=await API.get(`/customers/search?q=${custSearch}`);setCustResults(data.data);}catch{}},300);
    return()=>clearTimeout(t);
  },[custSearch]);

  const selectCust=c=>{setCustomerId(c._id);setCustomerName(c.customerName);setCustomerPhone(c.phone);setCustSearch(c.customerName);setCustResults([]);setShowAddCust(false);};
  
  const quickAddCust=async()=>{
    if(!newCustName.trim()){toast.error('Customer name is required');return;}
    if(!newCustPhone.trim()){toast.error('Phone number is required');return;}
    if(newCustPhone.trim().length<7){toast.error('Enter a valid phone number');return;}
    try{
      const{data}=await API.post('/customers',{customerName:newCustName.trim(),phone:newCustPhone.trim(),customerType:'regular'});
      setCustomerId(data.data._id);setCustomerName(data.data.customerName);setCustomerPhone(data.data.phone);
      setCustSearch(data.data.customerName);setShowAddCust(false);setNewCustName('');setNewCustPhone('');
      toast.success(`✅ Customer "${data.data.customerName}" added`);
    }catch(err){toast.error(err.response?.data?.message||'Failed to add customer');}
  };
  const handleSearchKey=async e=>{if(e.key==='Enter'&&searchQuery.length>=8){try{const{data}=await API.get(`/medicines/barcode/${searchQuery}`);if(data.data){addToCart(data.data);setSearchQuery('');setSearchResults([]);}}catch{toast.error('Barcode not found');}}};

  const addToCart=async med=>{
    if(!med||!med._id){toast.error('Invalid medicine');return;}
    const ex=cart.find(i=>i.medicineId===med._id);
    if(ex){
      if(ex.quantity>=ex.stock&&ex.stock>0){toast.warning(`${med.medicineName}: Only ${ex.stock} in stock`);}
      updateQty(ex.medicineId,ex.quantity+1);return;
    }
    if(med.currentStock<=0){
      try{const{data}=await API.get(`/medicines/substitutes/${med._id}`);if(data.data?.length>0){setSubstitutes(data.data);setSubFor(med);setShowSubs(true);return;}}catch{}
      toast.warning(`${med.medicineName} is out of stock — no alternatives found`);return;
    }
    const nc=[...cart,{medicineId:med._id,medicineName:med.medicineName,genericName:med.genericName||'',barcode:med.barcode,unitPrice:med.salePrice||0,mrp:med.mrp||0,quantity:1,discount:0,taxRate:med.taxRate||0,stock:med.currentStock||0,schedule:med.schedule,lineTotal:med.salePrice||0}];
    setCart(nc);checkDI(nc);
    setSearchQuery('');setSearchResults([]);searchRef.current?.focus();
  };

  const checkDI=async cc=>{
    if(cc.length<2&&!customerId)return;
    try{const{data}=await API.post('/prescriptions/check-interactions',{drugs:cc.map(i=>({genericName:i.genericName,medicineName:i.medicineName})),customerId});
      if(data.data?.totalAlerts>0){setInteractions(data.data);if(data.data.hasBlocking)setShowInteractions(true);else toast.warning(`⚠ ${data.data.totalAlerts} interaction(s)`);}
      else setInteractions(null);
    }catch{}
  };

  const updateQty=(id,q)=>{if(q<1)return removeItem(id);setCart(cart.map(i=>{if(i.medicineId===id){const lt=(i.unitPrice*q)-i.discount+((i.unitPrice*q-i.discount)*i.taxRate/100);return{...i,quantity:q,lineTotal:lt};}return i;}));};
  const updateDisc=(id,d)=>{const dv=parseFloat(d)||0;setCart(cart.map(i=>{if(i.medicineId===id){const lt=(i.unitPrice*i.quantity)-dv+((i.unitPrice*i.quantity-dv)*i.taxRate/100);return{...i,discount:dv,lineTotal:lt};}return i;}));};
  const removeItem=id=>setCart(cart.filter(i=>i.medicineId!==id));
  const clearCart=async()=>{
    if(!cart.length) return;
    if(!(await confirmDanger('All items in the current cart will be removed.', { title: 'Clear cart?', confirmText: 'Clear' }))) return;
    setCart([]);setOverallDiscPct(0);setOverallDiscAmt(0);setDiscMode('pct');
    setPayments([{method:'cash',amount:'',reference:''}]);setInteractions(null);
  };

  const sub=cart.reduce((s,i)=>s+(i.unitPrice*i.quantity),0);
  const itemDisc=cart.reduce((s,i)=>s+i.discount,0);
  const tax=cart.reduce((s,i)=>s+((i.unitPrice*i.quantity-i.discount)*i.taxRate/100),0);
  const after=sub-itemDisc+tax;
  const billDisc=discMode==='pct'
    ?(overallDiscPct>0?(after*overallDiscPct/100):0)
    :Math.min(overallDiscAmt||0,after);
  const net=Math.round(after-billDisc);
  const totalPay=payments.reduce((s,p)=>s+(parseFloat(p.amount)||0),0);
  const change=totalPay-net;

  const addPayRow=()=>setPayments([...payments,{method:'cash',amount:'',reference:''}]);
  const rmPayRow=i=>{if(payments.length>1)setPayments(payments.filter((_,j)=>j!==i));};
  const updPay=(i,f,v)=>setPayments(payments.map((p,j)=>j===i?{...p,[f]:v}:p));

  const holdBill=async()=>{
    if(!cart.length){toast.warning('Cart is empty — add medicines first');return;}
    try{await API.post('/sales/hold',{items:cart,customerName,customerId});toast.success('Bill held successfully');setCart([]);setOverallDiscPct(0);fetchHeldBills();}
    catch(err){toast.error(err.response?.data?.message||'Failed to hold bill');}
  };
  const resumeBill=async id=>{
    try{const{data}=await API.post(`/sales/held/${id}/resume`);setCart(data.data.items.map(i=>({...i,lineTotal:(i.unitPrice*i.quantity)-(i.discount||0)})));setCustomerName(data.data.customerName||'Walk-in');setShowHeld(false);fetchHeldBills();toast.success('Bill resumed');}
    catch(err){toast.error(err.response?.data?.message||'Failed to resume bill');}
  };

  const completeSale=async()=>{
    // ── FULL VALIDATION ──
    if(!cart.length){toast.warning('Cart is empty — add medicines first');return;}
    if(processing)return;
    if(net<=0){toast.warning('Total amount must be greater than zero');return;}

    // Validate each cart item
    for(const item of cart){
      if(!item.medicineId){toast.error(`Invalid item in cart: ${item.medicineName||'Unknown'}`);return;}
      if(!item.quantity||item.quantity<1){toast.error(`Quantity must be at least 1 for ${item.medicineName}`);return;}
      if(item.quantity>item.stock&&item.stock>0){toast.warning(`${item.medicineName}: Only ${item.stock} in stock, you have ${item.quantity}`);}
    }

    // Validate payments
    let hasValidPayment=false;
    const pl=[];
    for(const p of payments){
      const amt=parseFloat(p.amount);
      if(p.amount!==''&&isNaN(amt)){toast.error(`Invalid payment amount: "${p.amount}" — enter a valid number`);return;}
      if(amt>0){
        if((p.method==='card'||p.method==='upi')&&!p.reference){toast.warning(`Reference number recommended for ${p.method} payment`);}
        pl.push({method:p.method,amount:amt,reference:p.reference||''});
        hasValidPayment=true;
      }
    }

    // If no amount entered, default to cash = total
    if(!hasValidPayment){
      if(payments.length===1&&payments[0].method==='cash'&&payments[0].amount===''){
        pl.push({method:'cash',amount:net,reference:''});
      }else{
        toast.error('Please enter payment amount');return;
      }
    }

    const tp=pl.reduce((s,p)=>s+p.amount,0);
    if(tp<net&&!pl.some(p=>p.method==='credit')){
      toast.error(`Payment (${formatCurrency(tp)}) is less than total (${formatCurrency(net)}). Enter full amount or use Credit.`);return;
    }

    // ── PROCESS SALE ──
    setProcessing(true);
    try{
      const printName=billName.trim()||customerName;
      const{data}=await API.post('/sales',{
        items:cart.map(i=>({medicineId:i.medicineId,medicineName:i.medicineName,quantity:i.quantity,unitPrice:i.unitPrice,discount:i.discount||0,taxRate:i.taxRate||0})),
        payments:pl,customerName:printName,customerPhone,customerId,
        overallDiscount:discMode==='amt'?(overallDiscAmt||0):0,
        overallDiscountPercent:discMode==='pct'?(overallDiscPct||0):0
      });
      setLastSale(data.data);setShowReceipt(true);
      toast.success(`✅ Sale completed: ${data.data.invoiceNo} — ${formatCurrency(data.data.netTotal)}`);
      setCart([]);setOverallDiscPct(0);setOverallDiscAmt(0);setDiscMode('pct');setBillName('');setPayments([{method:'cash',amount:'',reference:''}]);
      setCustomerName('Walk-in Customer');setCustomerPhone('');setCustomerId(null);setCustSearch('');setInteractions(null);
    }catch(err){
      const msg=err.response?.data?.message||'Sale failed — please try again';
      toast.error(`❌ ${msg}`);
    }finally{setProcessing(false);}
  };

  const printReceipt=()=>{
    const w=window.open('','_blank','width=350,height=600');
    const rw=storeInfo?.settings?.receiptWidth==='58mm'?'58mm':'80mm';
    w.document.write(`<!DOCTYPE html><html><head><style>@page{size:${rw} auto;margin:2mm;}body{font-family:'Courier New',monospace;font-size:11px;width:${rw};margin:0;padding:4px;}.c{text-align:center;}.r{text-align:right;}.b{font-weight:bold;}.ln{border-top:1px dashed #000;margin:4px 0;}table{width:100%;border-collapse:collapse;}td{padding:1px 0;}.sn{font-size:14px;font-weight:bold;}.sm{font-size:9px;}</style></head><body><div class="c"><span class="sn">${storeInfo?.storeName||'MedStore Pro'}</span><br><span class="sm">${storeInfo?.address?.street||''}, ${storeInfo?.address?.city||''}<br>Ph: ${storeInfo?.phone||''} | DL: ${storeInfo?.drugLicenseNumber||''}</span></div><div class="ln"></div><div class="sm">Inv: <b>${lastSale?.invoiceNo}</b> | ${new Date(lastSale?.createdAt).toLocaleString()}<br>Customer: ${lastSale?.customerName} | Cashier: ${lastSale?.cashierName}</div><div class="ln"></div><table><tr class="b"><td>Item</td><td class="r">Qty</td><td class="r">Amt</td></tr>${lastSale?.items?.map(i=>`<tr><td>${i.medicineName}</td><td class="r">${i.quantity}</td><td class="r">${Math.round(i.lineTotal)}</td></tr>`).join('')||''}</table><div class="ln"></div><table><tr class="b"><td>TOTAL</td><td class="r">${formatCurrency(lastSale?.netTotal)}</td></tr><tr><td>Paid</td><td class="r">${formatCurrency(lastSale?.totalPaid)}</td></tr>${lastSale?.changeGiven>0?`<tr><td>Change</td><td class="r">${formatCurrency(lastSale?.changeGiven)}</td></tr>`:''}</table><div class="ln"></div><div class="c sm">${storeInfo?.settings?.receiptFooter||'Thank you!'}</div></body></html>`);
    w.document.close();setTimeout(()=>{w.print();w.close();},300);
  };
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      <div className="h-12 bg-gradient-to-r from-primary-800 to-primary-900 flex items-center px-4 gap-3 flex-shrink-0">
        <button onClick={()=>navigate('/dashboard')} className="text-white/80 hover:text-white text-sm flex items-center gap-1.5">
          <HiOutlineX className="w-4 h-4"/>Exit
        </button>
        <div className="flex-1 text-center text-white font-heading font-bold text-base">POS Terminal</div>
        {interactions?.totalAlerts>0&&(
          <button onClick={()=>setShowInteractions(true)} className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 animate-pulse">
            <HiOutlineExclamation className="w-3.5 h-3.5"/>{interactions.totalAlerts} Alerts
          </button>
        )}
        <span className="text-white/50 text-xs hidden md:block">F2 Search · F5 Hold · F10 Complete</span>
        <span className="text-white/80 text-sm font-medium">{user?.name}</span>
      </div>
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        <div className="w-full lg:flex-[60] flex flex-col lg:border-r border-gray-200 bg-white">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
              <input ref={searchRef}
                className="w-full pl-11 pr-4 py-3 text-base rounded-xl border-2 border-primary-200 focus:border-primary-500 outline-none"
                placeholder="Scan barcode or search medicines..."
                value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={handleSearchKey}/>
            </div>
            {searchResults.length>0&&(
              <div className="absolute z-20 left-3 right-3 lg:right-[40%] mt-1 bg-white rounded-xl shadow-2xl border max-h-72 overflow-y-auto">
                {searchResults.map(m=>(
                  <button key={m._id} onClick={()=>addToCart(m)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary-50 text-left border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.medicineName}</p>
                      <p className="text-xs text-gray-400">{m.genericName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600 text-sm">{formatCurrency(m.salePrice)}</p>
                      <p className={`text-xs ${m.currentStock<=0?'text-red-500 font-bold':'text-gray-400'}`}>Stock: {m.currentStock}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Category tabs + tile grid: hidden on mobile (search is the only flow there) */}
          <div className="hidden lg:flex gap-1.5 px-3 py-2 border-b border-gray-100 overflow-x-auto flex-shrink-0">
            {CAT_TABS.map(c=>(
              <button key={c} onClick={()=>{setSelectedCat(c);setTilesPage(1);}}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition
                  ${selectedCat===c?'bg-primary-600 text-white shadow-sm':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="hidden lg:block flex-1 overflow-y-auto p-3">
            {tilesLoading?<div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"/></div>:
            tiles.length===0?<div className="text-center py-10 text-gray-400 text-sm">No medicines</div>:
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {tiles.map(m=>{
                const oos=m.currentStock<=0;
                const ic=cart.find(i=>i.medicineId===m._id);
                return (
                  <button key={m._id} onClick={()=>addToCart(m)}
                    className={`relative p-3 rounded-xl border text-left transition-all active:scale-95
                      ${ic?'border-primary-500 bg-primary-50 ring-2 ring-primary-300 shadow-sm'
                        :oos?'border-red-200 bg-red-50/40 opacity-60'
                        :'border-gray-200 bg-white hover:border-primary-400 hover:shadow-md'}`}>
                    {ic&&(
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary-600 text-white rounded-full text-xs flex items-center justify-center font-bold shadow">
                        {ic.quantity}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.5em]">{m.medicineName}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{m.genericName||'—'}</p>
                    <div className="flex items-end justify-between mt-2">
                      <span className="text-base font-bold text-primary-700">{formatCurrency(m.salePrice)}</span>
                      <span className={`text-xs font-medium ${oos?'text-red-600':m.currentStock<=(m.lowStockThreshold||10)?'text-amber-600':'text-gray-500'}`}>
                        {oos?'Out':`${m.currentStock} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>}
            <div className="flex justify-center items-center gap-3 py-3">
              <button onClick={()=>setTilesPage(p=>Math.max(1,p-1))} disabled={tilesPage<=1} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30">← Prev</button>
              <span className="text-xs text-gray-500">Page {tilesPage}</span>
              <button onClick={()=>setTilesPage(p=>p+1)} disabled={tiles.length<40} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30">Next →</button>
            </div>
          </div>
          {cart.length>0&&(
            <div className="border-t-2 border-primary-100 lg:max-h-[38%] lg:overflow-y-auto flex-shrink-0 bg-white">
              <div className="px-3 py-2 bg-primary-50/60 flex items-center justify-between sticky top-0 z-10 border-b border-primary-100">
                <span className="text-sm font-semibold text-gray-700">🛒 {cart.length} items in cart</span>
                <button onClick={clearCart} className="text-xs font-medium text-red-500 hover:text-red-700">Clear all</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-[37px] z-10">
                  <tr className="text-left text-[11px] text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2">Item</th>
                    <th className="px-2 py-2 w-28 text-center">Qty</th>
                    <th className="px-2 py-2 w-24 text-right hidden sm:table-cell">Price</th>
                    <th className="px-2 py-2 w-20 text-right hidden md:table-cell">Disc</th>
                    <th className="px-2 py-2 w-24 text-right">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map(i=>(
                    <tr key={i.medicineId} className="hover:bg-gray-50/60">
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{i.medicineName}</p>
                        {i.genericName&&<p className="text-[11px] text-gray-400">{i.genericName}</p>}
                        {/* On mobile, show price inline since the Price column is hidden */}
                        <p className="text-[11px] text-gray-500 sm:hidden">{formatCurrency(i.unitPrice)} × {i.quantity}</p>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={()=>updateQty(i.medicineId,i.quantity-1)} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                            <HiOutlineMinus className="w-3.5 h-3.5"/>
                          </button>
                          <input type="number" min="1" value={i.quantity}
                            onChange={e=>updateQty(i.medicineId,parseInt(e.target.value)||1)}
                            className="w-12 text-center border rounded-md py-1 text-sm font-bold"/>
                          <button onClick={()=>updateQty(i.medicineId,i.quantity+1)} className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                            <HiOutlinePlus className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-gray-700 hidden sm:table-cell">{formatCurrency(i.unitPrice)}</td>
                      <td className="px-2 py-2 text-right hidden md:table-cell">
                        <input type="number" min="0" value={i.discount||''} placeholder="0"
                          onChange={e=>updateDisc(i.medicineId,e.target.value)}
                          className="w-16 text-right border rounded-md px-1.5 py-1 text-sm"/>
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-primary-700 text-sm">{formatCurrency(i.lineTotal)}</td>
                      <td className="text-center">
                        <button onClick={()=>removeItem(i.medicineId)} className="p-1.5 hover:bg-red-50 rounded-md">
                          <HiOutlineTrash className="w-4 h-4 text-red-500"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="w-full lg:flex-[40] flex flex-col bg-gray-50 lg:overflow-y-auto">
          <div className="p-3 bg-white border-b">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</label>
              <button onClick={()=>setShowAddCust(!showAddCust)} className="text-xs text-primary-600 font-medium hover:underline">{showAddCust?'Cancel':'+ New'}</button>
            </div>
            {showAddCust?(
              <div className="space-y-1">
                <input className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm" placeholder="Customer name *" value={newCustName} onChange={e=>setNewCustName(e.target.value)}/>
                <input className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm" placeholder="Phone number *" value={newCustPhone} onChange={e=>setNewCustPhone(e.target.value)}/>
                <button onClick={quickAddCust} className="w-full py-1.5 bg-primary-600 text-white text-xs rounded-lg font-medium hover:bg-primary-700">Add & Select</button>
              </div>
            ):(
              <div className="relative">
                <input className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm" placeholder="Search customer..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
                {custResults.length>0&&<div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-28 overflow-y-auto">{custResults.map(c=><button key={c._id} onClick={()=>selectCust(c)} className="w-full px-2 py-1.5 text-left hover:bg-primary-50 text-xs border-b">{c.customerName} — {c.phone}{c.allergies?.length>0&&<span className="text-red-500 ml-1">⚠{c.allergies.length}</span>}</button>)}</div>}
              </div>
            )}
            {customerId&&<div className="flex items-center justify-between mt-1"><p className="text-[10px] text-primary-600 font-medium">{customerName} • {customerPhone}</p><button onClick={()=>{setCustomerId(null);setCustomerName('Walk-in Customer');setCustomerPhone('');setCustSearch('');}} className="text-[9px] text-red-400 hover:underline">Clear</button></div>}
            <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Bill Name (optional)</label>
              <input
                className="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                placeholder="Print this name on bill (e.g. company name)"
                value={billName}
                onChange={e=>setBillName(e.target.value)}/>
              {billName.trim()&&<p className="text-[10px] text-primary-600 mt-0.5">Bill will print as: <b>{billName.trim()}</b></p>}
            </div>
          </div>
          <div className="p-3 bg-white border-b space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(sub)}</span></div>
            {itemDisc>0&&<div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-red-500">-{formatCurrency(itemDisc)}</span></div>}
            {tax>0&&<div className="flex justify-between"><span className="text-gray-500">Tax</span><span>+{formatCurrency(tax)}</span></div>}
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-gray-500 flex-1">Bill Discount</span>
              <div className="flex rounded-md border border-gray-200 overflow-hidden">
                <button type="button"
                  onClick={()=>{setDiscMode('pct');setOverallDiscAmt(0);}}
                  className={`px-2 py-1 text-xs font-medium ${discMode==='pct'?'bg-primary-600 text-white':'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>%</button>
                <button type="button"
                  onClick={()=>{setDiscMode('amt');setOverallDiscPct(0);}}
                  className={`px-2 py-1 text-xs font-medium ${discMode==='amt'?'bg-primary-600 text-white':'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>Rs</button>
              </div>
              {discMode==='pct'?(
                <input type="number" min="0" max="100" className="w-20 text-right border rounded-md px-2 py-1 text-sm"
                  value={overallDiscPct||''} placeholder="0"
                  onChange={e=>setOverallDiscPct(parseFloat(e.target.value)||0)}/>
              ):(
                <input type="number" min="0" className="w-20 text-right border rounded-md px-2 py-1 text-sm"
                  value={overallDiscAmt||''} placeholder="0"
                  onChange={e=>setOverallDiscAmt(parseFloat(e.target.value)||0)}/>
              )}
            </div>
            {billDisc>0&&<div className="flex justify-between text-red-500"><span>Bill Disc</span><span>-{formatCurrency(billDisc)}</span></div>}
            <div className="flex justify-between items-center pt-2 border-t-2 border-primary-200">
              <span className="font-heading font-bold text-base">TOTAL</span>
              <span className="text-2xl font-heading font-bold text-primary-700">{formatCurrency(net)}</span>
            </div>
          </div>
          <div className="p-3 bg-white border-b">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</label>
              <button onClick={addPayRow} className="text-xs text-primary-600 font-medium hover:underline">+ Split</button>
            </div>
            {payments.map((p,i)=>(
              <div key={i} className="flex gap-2 mb-2 items-center">
                <select className="border rounded-md px-2 py-1.5 text-sm w-24" value={p.method} onChange={e=>updPay(i,'method',e.target.value)}>
                  {PAY_METHODS.map(pm=><option key={pm.key} value={pm.key}>{pm.icon} {pm.label}</option>)}
                </select>
                <input type="number" placeholder={String(net)}
                  className="flex-1 border rounded-md px-2.5 py-1.5 text-base font-bold text-right"
                  value={p.amount} onChange={e=>updPay(i,'amount',e.target.value)}/>
                {(p.method==='card'||p.method==='upi')&&(
                  <input className="w-24 border rounded-md px-2 py-1.5 text-xs" placeholder="Ref#"
                    value={p.reference} onChange={e=>updPay(i,'reference',e.target.value)}/>
                )}
                {payments.length>1&&(
                  <button onClick={()=>rmPayRow(i)} className="p-1 hover:bg-red-50 rounded-md">
                    <HiOutlineX className="w-4 h-4 text-red-400"/>
                  </button>
                )}
              </div>
            ))}
            {payments[0]?.method==='cash'&&totalPay>0&&(
              <p className={`text-right text-sm font-bold ${change>=0?'text-primary-600':'text-red-600'}`}>
                Change: {formatCurrency(Math.max(0,change))}
              </p>
            )}
          </div>
          <div className="p-3 space-y-2 lg:mt-auto">
            {heldBills.length>0&&(
              <button onClick={()=>setShowHeld(true)} className="w-full py-2 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-medium text-sm flex items-center justify-center gap-2">
                <HiOutlinePlay className="w-4 h-4"/>Resume ({heldBills.length})
              </button>
            )}
            <button onClick={holdBill} disabled={!cart.length} className="w-full py-2 rounded-xl border-2 border-gray-300 text-gray-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-100 disabled:opacity-30">
              <HiOutlinePause className="w-4 h-4"/>Hold (F5)
            </button>
            <button onClick={completeSale} disabled={!cart.length||processing}
              className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-heading font-bold text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-30 active:scale-[0.98]">
              {processing?'Processing...':'✓ Complete — '+formatCurrency(net)}
            </button>
          </div>
        </div>
      </div>
      {showHeld&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowHeld(false)}><div className="bg-white rounded-2xl w-full max-w-lg max-h-[70vh] overflow-hidden" onClick={e=>e.stopPropagation()}><div className="px-5 py-3 border-b flex justify-between"><h3 className="font-heading font-bold">Held({heldBills.length})</h3><button onClick={()=>setShowHeld(false)}><HiOutlineX className="w-5 h-5"/></button></div><div className="overflow-y-auto max-h-[55vh] divide-y">{heldBills.map(h=><div key={h._id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50"><div className="flex-1"><p className="font-medium text-sm">{h.customerName||'Walk-in'}</p><p className="text-xs text-gray-400">{h.items?.length} items • {formatCurrency(h.subtotal)}</p></div><button onClick={()=>resumeBill(h._id)} className="btn-primary text-xs px-3 py-1">Resume</button><button onClick={async()=>{await API.delete(`/sales/held/${h._id}`);fetchHeldBills();}} className="p-1 hover:bg-red-50 rounded"><HiOutlineTrash className="w-4 h-4 text-red-400"/></button></div>)}</div></div></div>}
      {showInteractions&&interactions&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowInteractions(false)}><div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e=>e.stopPropagation()}><div className="px-5 py-3 border-b bg-red-50 flex justify-between"><h3 className="font-heading font-bold text-red-800 flex items-center gap-2"><HiOutlineExclamation className="w-5 h-5"/>Drug Interaction Alert</h3><button onClick={()=>setShowInteractions(false)}><HiOutlineX className="w-5 h-5"/></button></div><div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">{interactions.interactions?.map((int,i)=><div key={i} className={`p-3 rounded-xl border ${int.severity==='contraindicated'?'bg-red-50 border-red-200':int.severity==='major'?'bg-orange-50 border-orange-200':'bg-amber-50 border-amber-200'}`}><span className={`badge text-[10px] ${int.severity==='contraindicated'?'badge-red':'badge-amber'}`}>{int.severity}</span><span className="text-xs font-bold ml-2">{int.drug1} ↔ {int.drug2}</span><p className="text-xs text-gray-700 mt-1">{int.description}</p>{int.management&&<p className="text-[10px] text-gray-500 mt-1">Mgmt: {int.management}</p>}</div>)}{interactions.allergyAlerts?.map((a,i)=><div key={'a'+i} className="p-3 rounded-xl bg-red-50 border border-red-300"><span className="badge badge-red text-[10px]">ALLERGY</span><p className="text-xs font-bold mt-1">{a.message}</p></div>)}{interactions.conditionAlerts?.map((c,i)=><div key={'c'+i} className="p-3 rounded-xl bg-amber-50 border border-amber-200"><span className="badge badge-amber text-[10px]">CONDITION</span><p className="text-xs mt-1">{c.message}</p></div>)}</div><div className="p-3 border-t flex gap-2"><button onClick={()=>setShowInteractions(false)} className="btn-secondary flex-1 text-sm">Override</button><button onClick={()=>{setShowInteractions(false);clearCart();}} className="btn-danger flex-1 text-sm">Clear Cart</button></div></div></div>}
      {showSubs&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowSubs(false)}><div className="bg-white rounded-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}><div className="px-5 py-3 border-b flex justify-between"><h3 className="font-heading font-bold text-sm flex items-center gap-2"><HiOutlineSwitchHorizontal className="w-4 h-4 text-blue-500"/>Out of Stock — Generics</h3><button onClick={()=>setShowSubs(false)}><HiOutlineX className="w-5 h-5"/></button></div><div className="p-3"><p className="text-xs text-gray-500 mb-3"><b>{subFor?.medicineName}</b> out of stock. Same composition:</p>{substitutes.map(s=><button key={s._id} onClick={()=>{addToCart(s);setShowSubs(false);}} className="w-full p-2 rounded-xl border hover:border-primary-300 hover:bg-primary-50 text-left mb-1 flex justify-between"><div><p className="font-medium text-sm">{s.medicineName}</p><p className="text-[10px] text-gray-400">{s.manufacturer}</p></div><div className="text-right"><p className="font-bold text-primary-600">{formatCurrency(s.salePrice)}</p><p className="text-[10px]">Stock:{s.currentStock}</p></div></button>)}</div></div></div>}
      {showReceipt&&lastSale&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowReceipt(false)}><div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="p-5 text-center border-b border-dashed"><p className="font-heading font-bold text-lg">{storeInfo?.storeName||'MedStore Pro'}</p><p className="text-[10px] text-gray-400">{storeInfo?.address?.city} • {storeInfo?.phone}</p><p className="text-xs font-mono font-bold mt-1">{lastSale.invoiceNo}</p></div><div className="p-4"><table className="w-full text-xs mb-3"><thead><tr className="border-b"><th className="text-left py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Amt</th></tr></thead><tbody>{lastSale.items?.map((it,i)=><tr key={i} className="border-b border-gray-50"><td className="py-1">{it.medicineName}</td><td className="text-right">{it.quantity}</td><td className="text-right">{formatCurrency(it.lineTotal)}</td></tr>)}</tbody></table><div className="border-t border-dashed pt-2 space-y-1 text-xs"><div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{formatCurrency(lastSale.netTotal)}</span></div>{lastSale.changeGiven>0&&<div className="flex justify-between text-primary-600"><span>Change</span><span>{formatCurrency(lastSale.changeGiven)}</span></div>}</div></div><div className="p-3 border-t flex gap-2"><button onClick={printReceipt} className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm"><HiOutlinePrinter className="w-4 h-4"/>Print</button><button onClick={()=>setShowReceipt(false)} className="btn-primary flex-1 text-sm">New Sale</button></div></div></div>}
    </div>
  );
}
