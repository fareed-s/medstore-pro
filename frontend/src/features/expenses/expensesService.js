import API from '../../utils/api';

export const listExpenses    = async () => (await API.get('/finance/expenses')).data.data;
export const getExpensesSummary = async () => (await API.get('/finance/expenses/summary')).data.data;
export const createExpense   = async (payload) => (await API.post('/finance/expenses', payload)).data.data;
export const deleteExpense   = async (id) => (await API.delete(`/finance/expenses/${id}`)).data;
