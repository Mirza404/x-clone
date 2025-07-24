import { Toaster } from 'react-hot-toast';

const CustomToaster = () => (
  <Toaster
    position="bottom-center"
    toastOptions={{
      className: '',
      icon: '',
      style: {
        borderRadius: '5px',
        background: '#3b82f6',
        color: '#fff',
        fontSize: '12px',
        paddingLeft: '0px',
        textAlign: 'center',
      },
    }}
  />
);

export default CustomToaster;
