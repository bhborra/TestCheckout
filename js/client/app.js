// Render the button component
paypal
  .Buttons({
    // Sets up the transaction when a payment button is clicked
    createOrder: createOrderCallback,
    onApprove: onApproveCallback,
  })
  .render("#paypal-button-container");

// Render each field after checking for eligibility
const cardField = window.paypal.CardFields({
  createOrder: createOrderCallback,
  onApprove: onApproveCallback,
});

if (cardField.isEligible()) {
  const nameField = cardField.NameField({});
  nameField.render("#card-name-field-container");

  const numberField = cardField.NumberField({});
  numberField.render("#card-number-field-container");

  const cvvField = cardField.CVVField({});
  cvvField.render("#card-cvv-field-container");

  const expiryField = cardField.ExpiryField({});
  expiryField.render("#card-expiry-field-container");

  // Add click listener to submit button and call the submit function on the CardField component
  document
    .getElementById("card-field-submit-button")
    .addEventListener("click", () => {
      cardField.submit({}).then(() => {
        // submit successful
      });
    });
}

async function createOrderCallback() {
  resultMessage("");
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // use the "body" param to optionally pass additional order information
      // like product ids and quantities
      body: JSON.stringify({
        cart: [
          {
            id: "ORD-123",
            quantity: "1",
          },
        ],
      }),
    });

    const orderData = await response.json();

    if (orderData.id) {
      return orderData.id;
    } else {
      const errorDetail = orderData?.details?.[0];
      const errorMessage = errorDetail
        ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
        : JSON.stringify(orderData);

      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error(error);
    resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
  }
}

async function onApproveCallback(data, actions) {
  try {
    const response = await fetch(`/api/orders/${data.orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const orderData = await response.json();
    // Three cases to handle:
    //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
    //   (2) Other non-recoverable errors -> Show a failure message
    //   (3) Successful transaction -> Show confirmation or thank you message

    const transaction =
      orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
      orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
    const errorDetail = orderData?.details?.[0];

    if (errorDetail || !transaction || transaction.status === "DECLINED") {
      // (2) Other non-recoverable errors -> Show a failure message
      let errorMessage;
      if (transaction) {
        errorMessage = `Transaction ${transaction.status}: ${transaction.id}`;
      } else if (errorDetail) {
        errorMessage = `${errorDetail.description} (${orderData.debug_id})`;
      } else {
        errorMessage = JSON.stringify(orderData);
      }

      throw new Error(errorMessage);
    } else {
      // (3) Successful transaction -> Show confirmation or thank you message
      // Or go to another URL:  actions.redirect('thank_you.html');
      resultThankyou(transaction);
      console.log(
        "Capture result",
        orderData,
        JSON.stringify(orderData, null, 2)
      );
    }
  } catch (error) {
    console.error(error);
    resultMessage(
      `Sorry, your transaction could not be processed...<br><br>${error}`
    );
  }
}

function submitBuyerInfo() {
  const firstname = document.getElementById('buyer-firstname').value;
  const lastname = document.getElementById('buyer-lastname').value;
  const email = document.getElementById('buyer-email').value;
  const phone = document.getElementById('buyer-phone').value;
  const address = document.getElementById('buyer-address').value;
  const zipcode = document.getElementById('buyer-zipcode').value;

  if (address.length < 10) {
      alert("Shipping address must be at least 10 characters long.");
      return;
  }
  if (zipcode.length < 5) {
    alert("zipcode must be 5 characters long.");
    return;
}

  document.getElementById('display-firstname').textContent = firstname;
  document.getElementById('display-lastname').textContent = lastname;
  document.getElementById('display-email').textContent = email;
  document.getElementById('display-phone').textContent = phone;
  document.getElementById('display-address').textContent = address;
  document.getElementById('display-zipcode').textContent = zipcode;

  document.getElementById('buyer-info-display').style.display = 'block';
}


// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  const container = document.querySelector("#result-message");
  container.innerHTML = message;
}

function resultThankyou(transaction) {

  localStorage.setItem('transactionid', JSON.stringify(transaction.id));
  localStorage.setItem('transactionstatus', JSON.stringify(transaction.status));

  // Redirect to the next page after transaction completes
  window.location.href = 'thankyou.html';
 
}
