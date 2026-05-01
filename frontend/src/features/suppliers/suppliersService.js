import API from '../../utils/api';

export const listSuppliers   = async ({ search } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const { data } = await API.get(`/purchase/suppliers?${params}`);
  return data.data;
};
export const createSupplier  = async (payload) => (await API.post('/purchase/suppliers', payload)).data.data;
export const updateSupplier  = async (id, payload) => (await API.put(`/purchase/suppliers/${id}`, payload)).data.data;
