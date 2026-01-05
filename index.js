const apiKey = '2x3331TlkrrEE7YOBNmzIZCzGIVaJBm1vi2WHCqF';
const serverUrl = 'https://api.cohere.com/v2/chat';
const model = 'command-a-03-2025';

let chosenCase = null;
let currentRound = 1;
const totalRounds = 5;
const casesPerRound = 5;
let offer = 0;
let roundOpens = 0;
let gameEnded = false;
let isOfferActive = false;

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

const caseValues = shuffle (
    [0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1000,
    5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000, 500000,
    750000, 1000000, 2000000]
);

const systemMessage = `You are the Banker from Deal or No Deal. 
React briefly to case openings. Remind them how many cases remain in the round. 
Only ask 'Deal or No Deal' when an offer is actually presented. 
Your goal is to intimidate the player. 
If a LOW value (under $1,000) is opened, be angry and worried because the player is winning. 
If a HUGE value ($100,000 or more) is opened, be thrilled, mocking, and celebratory because the player just lost a fortune.
Keep responses under 20 words. Use dramatic language like "Ouch!", "Disaster!", or "My wallet is safe!"
`;

const chatHistory = [{ role: "system", content: systemMessage }];

const unopenedGrid = document.getElementById('unopenedCases');
const openedGrid = document.querySelector(".cases-column.opened .cases-grid");
const chosenSlot = document.querySelector(".chosen-case-slot");
const bankerText = document.querySelector(".banker-text");
const offerDisplay = document.querySelector(".offer");
const dealBtn = document.querySelector("button.deal");
const noDealBtn = document.querySelector("button.no-deal");
const casesLeftDisplay = document.getElementById('casesLeftDisplay');
const currentRoundDisplay = document.getElementById('currentRoundDisplay');
const restartBtn = document.getElementById('restartBtn');
const lastOfferDisplay = document.getElementById('lastOfferDisplay');
const prevOfferContainer = document.getElementById('prevOfferContainer');

function initGame() {
    caseValues.forEach((val, i) => {
        const caseEl = document.createElement('div');
        caseEl.className = 'case';
        caseEl.textContent = i + 1;
        caseEl.dataset.value = val;
        caseEl.addEventListener('click', () => handleClick(caseEl));
        unopenedGrid.appendChild(caseEl);
    });
    bankerText.textContent = 'Choose your lucky case to start!';
    toggleButtons(false);
}

async function updateBankerText(message) {
    const panel = document.querySelector('.center-panel');
    panel.classList.add('banker-calling');
    bankerText.textContent = "...The Banker is typing...";

    chatHistory.push({ role: "user", content: message });

    try {
        const response = await fetch(serverUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ model: model, messages: chatHistory }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Cohere API Error:", errorData);
            throw new Error(`API Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response Data:", data);
        
        let aiText = "";
        if (data.message && data.message.content && data.message.content[0]) {
            aiText = data.message.content[0].text;
        } else if (data.text) {
            aiText = data.text; 
        } else {
            aiText = "The Banker grunts and hangs up.";
        }

        chatHistory.push({ role: "assistant", content: aiText });
        bankerText.textContent = aiText;

    } catch (err) {
        console.error("Game Error:", err);
        bankerText.textContent = "The Banker is glaring at you silently.";
    }

    panel.classList.remove('banker-calling');
}

function handleClick(caseEl){
    if (gameEnded || isOfferActive) return;

    if (!chosenCase) {
        selectPlayerCase(caseEl);
        return;
    }

    if (caseEl.classList.contains('opened') || caseEl === chosenCase) return;

    openCase(caseEl);
    roundOpens++;

    const casesRemainingInRound = casesPerRound - roundOpens;
    if (casesLeftDisplay) casesLeftDisplay.textContent = Math.max(0, casesRemainingInRound);

    if (unopenedGrid.children.length === 1) {
        isOfferActive = true; 
        generateOffer(true); 
    } 
    
    else if (roundOpens === casesPerRound) {
        isOfferActive = true;
        generateOffer(false); 
    } 
    
    else {
        updateBankerText(`Case opened. ${casesRemainingInRound} more to go.`);
    }
}

function selectPlayerCase(caseEl) {
    chosenCase = caseEl;
    caseEl.classList.add("chosen");
    unopenedGrid.removeChild(caseEl);
    chosenSlot.appendChild(caseEl);

    const roundInfo = document.getElementById('roundInfo');
    if (roundInfo) roundInfo.style.visibility = 'visible';

    bankerText.textContent = `Case ${caseEl.textContent} is yours. Now, open 5 cases to start Round 1!`;
}

function openCase(caseEl) {
    const val = parseInt(caseEl.dataset.value);
    caseEl.classList.add("opened");
    caseEl.textContent = `$${val.toLocaleString()}`;
    
    if (val >= 200000) {
        caseEl.classList.add("danger-reveal");
    }

    unopenedGrid.removeChild(caseEl);
    openedGrid.appendChild(caseEl);
}

function generateOffer(isFinal = false) {
    if (offer > 0) {
        prevOfferContainer.style.visibility = "visible";
        lastOfferDisplay.textContent = `$${offer.toLocaleString()}`;
    }

    const remainingValues = getRemainingValues();
    const avg = remainingValues.reduce((a, b) => a + b, 0) / remainingValues.length;

    if (isFinal) {
        gameEnded = true;
        offer = Math.round(avg * 0.95);
        updateBankerText(`This is the end. My final offer is $${offer.toLocaleString()}. Deal or No Deal?`);
    } else {
        const multiplier = 0.3 + (currentRound * 0.1); 
        offer = Math.round(avg * multiplier);
        updateBankerText(`The board is changing. I offer you $${offer.toLocaleString()}. Deal or No Deal?`);
    }

    offerDisplay.textContent = `$${offer.toLocaleString()}`;
    toggleButtons(true);
}

function getRemainingValues() {
    const values = Array.from(unopenedGrid.children).map(c => parseInt(c.dataset.value));
    values.push(parseInt(chosenCase.dataset.value));
    return values;
}

function toggleButtons(active) {
    console.trace("toggleButtons was called!");
    dealBtn.disabled = !active;
    noDealBtn.disabled = !active;
}

function triggerWinEffect(type) {
    if (type === 'good' || type === 'huge') {
        document.body.style.background = "linear-gradient(to bottom, #1a4a1a, #0a0a0a)"; 
     
        const goldFlash = document.createElement('div');
        goldFlash.className = 'win-overlay';
        document.body.appendChild(goldFlash);
        setTimeout(() => goldFlash.remove(), 2000);
    } else {
        document.body.style.background = "linear-gradient(to bottom, #4a1a1a, #0a0a0a)"; 
    }
}

dealBtn.addEventListener('click', () => {
    gameEnded = true;
    isOfferActive = false;
    const actualValue = parseInt(chosenCase.dataset.value);
    const messageElement = document.getElementById('finalMessage'); 
    
   if (offer > actualValue) {
        bankerText.textContent = "I'VE BEEN ROBBED!";
        messageElement.innerHTML = `SMART MOVE! You took <span style="color: #4caf50;">$${offer.toLocaleString()}</span> and your case only had $${actualValue.toLocaleString()}!`;
        triggerWinEffect('good');
    } else {
        bankerText.textContent = "SUCKER! I keep the change!";
        messageElement.innerHTML = `Ouch... You took $${offer.toLocaleString()}, but your case held <span style="color: #f44336;">$${actualValue.toLocaleString()}</span>.`;
        triggerWinEffect('bad');
    }

    document.getElementById('restartBtn').style.display = 'block';
    toggleButtons(false);
});

noDealBtn.addEventListener('click', () => {
    const messageElement = document.getElementById('finalMessage'); 

    if (unopenedGrid.children.length === 1) {
        gameEnded = true;
        isOfferActive = false;
        
        const actualValue = parseInt(chosenCase.dataset.value);
        const otherValue = parseInt(unopenedGrid.children[0].dataset.value);
        
        if (actualValue > offer) {
            bankerText.textContent = "NO! My money is gone!";
            messageElement.innerHTML = `VICTORY! You rejected $${offer.toLocaleString()} and WON <span style="color: #4caf50;">$${actualValue.toLocaleString()}</span>!`;
            triggerWinEffect('huge');
        } else {
            bankerText.textContent = "Mwahaha! I keep my millions!";
            messageElement.innerHTML = `DISASTER! You rejected $${offer.toLocaleString()} for a case worth only <span style="color: #f44336;">$${actualValue.toLocaleString()}</span>!`;
            triggerWinEffect('bad');
        }
        
        chosenCase.textContent = `$${actualValue.toLocaleString()}`;
        unopenedGrid.children[0].textContent = `$${otherValue.toLocaleString()}`;
        unopenedGrid.children[0].classList.add('opened');
        document.getElementById('restartBtn').style.display = 'block';
    } else {
        isOfferActive = false;
        roundOpens = 0;
        currentRound++;
        if(currentRoundDisplay) currentRoundDisplay.textContent = currentRound;
        if(casesLeftDisplay) casesLeftDisplay.textContent = casesPerRound;
        bankerText.textContent = `No Deal! Round ${currentRound}. Open ${casesPerRound} cases.`;
    }
    toggleButtons(false);
});

document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('restartBtn').style.display = 'none';
    
    location.reload(); 
});

initGame();
