import API from '../../utils/api';

export const listPrescriptions  = async ({ status } = {}) => {
  const qs = status ? `?status=${status}` : '';
  return (await API.get(`/prescriptions${qs}`)).data.data;
};
export const createPrescription = async (payload) => (await API.post('/prescriptions', payload)).data.data;
export const searchCustomers    = async (q) => (await API.get(`/customers/search?q=${q}`)).data.data;
