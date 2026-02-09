# Demo: How to handle forms

## 1. Template

We will start with a basic registration. We will ask for a username, password and confirmation, and a profile picture.

```html
<body>
  <h1>Registry example</h1>
  <form click:submit:log>
    <input type="text" id="user" placeholder="user" />
    <input type="text" id="password" placeholder="password" />
    <input type="text" id="passwordconf" placeholder="passwordconf" />
    <input type="file" name="profile" id="profile" />
    <button type="submit" id="submit">Submit</button>
  </form>
</body>
```

## 2. Data validation.

We will validate data will doubledots filters.

```html
<script>
  customReactions.define("passVal", function (e) {
    let password = document.getElementById("password").value;
    let passwordconf = document.getElementById("passwordconf").value;

    if (passwordconf.length <= 8) return;

    if (password.length <= 8) {
      throw new Error("Password too short");
      throw customReactions.break;
    }

    //TODO: ADD MORE PASSWORD VALIDATION

    if (password !== passwordconf) {
      throw new Error("Passwords do not match");
      throw customReactions.break;
    }
  });

  customReactions.define("fileVal", function (e) {
    let profile = document.getElementById("profile").files[0];
    if (profile.size > 1000000) {
      throw new Error("File too large");
      throw customReactions.break;
    }
    if (profile.filetype !== "image/png") {
      throw new Error("wrong file type");
      throw customReactions.break;
    }
  });
</script>
```

## 3. Add form submition

After validating data, we submit the form. We do this by asigning a click to the form

?? SHOULD WE ADD THIS.OWNERELEMENT.FORMDATA ??

```html
<script>
  customReactions.define("submit", async function (e) {
    e.preventDefault();

    // if not in the submit button, break the chain
    if (e.target.id !== "submit") throw customReactions.break;

    let user = document.getElementById("user").value;
    let password = document.getElementById("password").value;
    let profile = document.getElementById("profile").files[0];

    let formData = new FormData();
    formData.append("user", user);
    formData.append("password", password);
    formData.append("profile", profile);

    let response = await fetch("/api/register", {
      method: "POST",
      body: formData,
    });

    let data = await response.json();
    if (data.error) throw new Error(data.error);

    return data;
  });
</script>
```

## 4. Add response reaction

For this demo we simple log the response to the console.

```html
<script>
  customReactions.define("log", function (e, i) {
    console.log(i);
  });
</script>
```

## 5. Putting it all together

We make the complete attribute `click:passVal:fileVal:submit:log` on the form element. We also place the validation on each of the input fields as needed.

```html
<form click:passVal:fileVal:submit:log>
  <input type="text" id="user" placeholder="user" />
  <input type="text" change:passVal id="password" placeholder="password" />
  <input type="text" change:passVal id="passwordconf" placeholder="passwordconf" />
  <input type="file" change:fileVal name="profile" id="profile" />
  <button type="submit" id="submit">Submit</button>
</form>
```
