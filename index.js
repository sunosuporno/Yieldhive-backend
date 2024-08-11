require("dotenv").config();
const { ethers } = require("ethers");
const cron = require("node-cron");
const axios = require("axios");

console.log("Environment variables:");
console.log("VIRTUAL_MAINNET_RPC_URL:", process.env.VIRTUAL_MAINNET_RPC_URL);
console.log(
  "PRIVATE_KEY:",
  process.env.PRIVATE_KEY ? "Set (not shown for security)" : "Not set"
);

async function updatePythPrice(contractAddress) {
  // Set up the provider using Tenderly's virtual network RPC URL
  const RPC_URL = process.env.VIRTUAL_MAINNET_RPC_URL;
  if (!RPC_URL) {
    throw new Error("VIRTUAL_MAINNET_RPC_URL is not set in .env file");
  }
  console.log("Using RPC_URL:", RPC_URL);

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Set up a signer
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set in .env file");
  }
  console.log("Private key is set (not shown for security)");

  const signer = new ethers.Wallet(privateKey, provider);

  // ABI for the setPricePyth function
  const abi = [
    "function setPricePyth(bytes[] calldata newPriceUpdate) external",
  ];

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, abi, signer);

  // Fetch data from the Pyth Network URL
  const url =
    "https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a&ids%5B%5D=0x15ecddd26d49e1a8f1de9376ebebc03916ede873447c1255d2d5891b92ce5717&ids%5B%5D=0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33&ids%5B%5D=0x9db37f4d5654aad3e37e2e14ffd8d53265fb3026d1d8f91146539eebaa2ef45f&encoding=hex";

  try {
    const response = await axios.get(url);
    const data = response.data.binary.data[0];

    // Prepend '0x' to the data
    const priceUpdate = ["0x" + data];

    // Call the setPricePyth function
    const tx = await contract.setPricePyth(priceUpdate);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    console.log(
      "Price update successful. Transaction hash:",
      receipt.transactionHash
    );

    // Get the explorer base URL for Tenderly
    const EXPLORER_BASE_URL = `https://dashboard.tenderly.co/explorer/vnet/30599e9d-e006-4b0e-b05f-eea92270a3d7`;
    console.log(
      "Transaction URL:",
      `${EXPLORER_BASE_URL}/tx/${receipt.transactionHash}`
    );
  } catch (error) {
    console.error("Error updating price:", error);
  }
}

// Set up the cron job to run every 2 minutes
cron.schedule("*/2 * * * *", async () => {
  console.log("Running price update task every 2 minutes");
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("CONTRACT_ADDRESS is not set in .env file");
    return;
  }

  try {
    await updatePythPrice(contractAddress);
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});

console.log(
  "Cron job scheduled to run every 2 minutes. Waiting for next execution..."
);
