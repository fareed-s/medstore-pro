import { configureStore } from '@reduxjs/toolkit';
import authReducer          from './authSlice';
import customersReducer     from '../features/customers/customersSlice';
import medicinesReducer     from '../features/medicines/medicinesSlice';
import salesReducer         from '../features/sales/salesSlice';
import suppliersReducer     from '../features/suppliers/suppliersSlice';
import expensesReducer      from '../features/expenses/expensesSlice';
import prescriptionsReducer from '../features/prescriptions/prescriptionsSlice';

const store = configureStore({
  reducer: {
    auth:          authReducer,
    customers:     customersReducer,
    medicines:     medicinesReducer,
    sales:         salesReducer,
    suppliers:     suppliersReducer,
    expenses:      expensesReducer,
    prescriptions: prescriptionsReducer,
  },
});

export default store;
