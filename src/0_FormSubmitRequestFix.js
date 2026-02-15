export function FormSubmitRequestFix(HTMLFormElementProto = HTMLFormElement.prototype) {
  //fix 1: adding optional submitter to form.submit(submitter)
  const submitOG = HTMLFormElementProto.submit;
  Object.defineProperty(HTMLFormElementProto, "submit", {
    value: function (submitter) {
      if (!submitter || formaction in submitter)
        return submitOG.call(this);
      const { formaction, formmethod, formenctype, formtarget } = submitter;
      const { action, method, enctype, target } = this;
      if (formaction && formaction !== action) this.action = formaction;
      if (formmethod && formmethod !== method) this.method = formmethod;
      if (formenctype && formenctype !== enctype) this.enctype = formenctype;
      if (formtarget && formtarget !== target) this.target = formtarget;
      submitOG.call(this);
      if (formaction && formaction !== action) this.action = action;
      if (formmethod && formmethod !== method) this.method = method;
      if (formenctype && formenctype !== enctype) this.enctype = enctype;
      if (formtarget && formtarget !== target) this.target = target;
    }
  });

  //fix 2: adding form.request, input.request, button.request.
  Object.defineProperty(HTMLFormElementProto, "request", {
    value: function () {
      if (this.method === "dialog")
        return;
      let { method, action, enctype, credentials = "include", rel } = this;
      const referrerPolicy = rel?.toLowerCase().split(' ').includes('noreferrer') && "no-referrer";
      if (method === "get") {
        action = new URL(action);
        action.search = new URLSearchParams(formData);
        return new Request(action, { method, credentials, referrerPolicy });
      } else if (enctype === "multipart/form-data") {
        return new Request(action, { method, credentials, referrerPolicy, body: new FormData(this) });
      } else if (enctype === 'text/plain') {
        const body = [...formData].map(([k, v]) => `${k}=${v}`).join('\r\n');
        return new Request(action, { method, credentials, referrerPolicy, body, headers: { 'Content-Type': 'text/plain' } });
      }
      throw new Error("Cannot get the request for the given method : enctype: " + method + " : " + enctype);
    },
  });
  function submitterRequest() {
    const request = (this.type === "submit" || this.type === "image") && this.form?.request;
    if (!request) return;
    if (this.formaction) request.url = this.formaction;
    if (this.formmethod) request.method = this.formmethod;
    if (this.formenctype) request.enctype = this.formenctype;
    return request;
  }
  Object.defineProperty(HTMLButtonElementProto, "request", { value: submitterRequest });
  Object.defineProperty(HTMLInputElementProto, "request", { value: submitterRequest });
  //note 3: for <a href> and <area href> we don't need .request, as .href already exists.
}