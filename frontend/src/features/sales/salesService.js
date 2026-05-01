import API from '../../utils/api';

export const listSales = async ({ page = 1, limit = 25, search, status, dateFrom, dateTo } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search)   params.set('search', search);
  if (status)   params.set('status', status);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo)   params.set('dateTo', dateTo);
  const { data } = await API.get(`/sales?${params}`);
  return { list: data.data, pagination: data.pagination };
};

export const getTodaySummary = async () => {
  const { data } = await API.get('/sales/today-summary');
  return data.data;
};

export const voidSale = async (id, reason) => {
  const { data } = await API.post(`/sales/${id}/void`, { reason });
  return data.data;
};
