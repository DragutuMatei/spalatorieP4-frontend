import { toast } from "react-toastify";
const options = {
  position: "top-center",
  closeOnClick: true,
  theme: "colored",
};
const toast_promise = async (fct, succ, fail) => {
  return await toast.promise(
    fct,
    {
      pending: "Se incarca!",
      error: fail || "A aparut o eroare",
      success: succ || "Mesaj transmis cu success!",
    },
    options
  );
};
const toast_error = (msg) => {
  toast.error(msg, options);
};

const toast_warn = (msg) => {
  toast.warn(msg, options);
};

const toast_success = (msg) => {
  toast.success(msg, options);
};

export { toast_error, toast_success, toast_warn, toast_promise };
