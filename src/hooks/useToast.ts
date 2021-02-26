import {useContext} from 'react';
import {ToastContext} from 'components/Toast';

const useToast = () => {
  const context = useContext(ToastContext);

  return context.toggleToast;
};

export default useToast;
