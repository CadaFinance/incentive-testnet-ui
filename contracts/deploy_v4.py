import json
import os
from web3 import Web3
from solcx import compile_standard, install_solc

# 1. SETUP
def load_env_file(filepath):
    if not os.path.exists(filepath): return
    print(f"Loading {filepath}...")
    with open(filepath, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, value = line.strip().split("=", 1)
                os.environ[key] = value.strip('"').strip("'")

# Load environment variables
# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_env_file(os.path.join(BASE_DIR, ".env.local"))
load_env_file(os.path.join(BASE_DIR, ".env"))

RPC_URL = os.getenv("RPC_URL", "https://rpc.zugchain.org")
PRIVATE_KEY = os.getenv("PRIVATE_KEY") or os.getenv("DEPLOYER_PRIVATE_KEY")
CHAIN_ID = int(os.getenv("CHAIN_ID") or os.getenv("NEXT_PUBLIC_CHAIN_ID") or 824642)

if not PRIVATE_KEY:
    print("Error: PRIVATE_KEY or DEPLOYER_PRIVATE_KEY missing.")
    exit(1)

w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)

# 2. COMPILE
SOLC_VERSION = "0.8.20"
install_solc(SOLC_VERSION)

def compile_contract(filename, contract_name):
    print(f"Compiling {filename}...")
    contract_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    with open(contract_path, "r", encoding="utf-8") as f:
        source = f.read()
    
    compiled = compile_standard({
        "language": "Solidity",
        "sources": {filename: {"content": source}},
        "settings": {"outputSelection": {"*": {"*": ["abi", "evm.bytecode"]}}}
    }, solc_version=SOLC_VERSION)
    
    abi = compiled["contracts"][filename][contract_name]["abi"]
    bytecode = compiled["contracts"][filename][contract_name]["evm"]["bytecode"]["object"]
    return abi, bytecode

# 3. DEPLOY FUNCTION
def deploy(name, abi, bytecode, args=[]):
    print(f"Deploying {name}...")
    Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(account.address)
    
    tx = Contract.constructor(*args).build_transaction({
        "chainId": CHAIN_ID,
        "from": account.address,
        "nonce": nonce,
        "gasPrice": w3.eth.gas_price
    })
    
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"{name} Tx Sent: {tx_hash.hex()}")
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"{name} Deployed at: {receipt.contractAddress}")
    return receipt.contractAddress

# 4. EXECUTE DEPLOYMENT
print("--- Starting V4 Deployment ---")

# Step 1: Deploy new vZUG Token
vzug_abi, vzug_bin = compile_contract("vZUGToken.sol", "vZUGToken")
# Mint 10 Trillion Tokens (10 * 10^12 * 10^18)
vzug_addr = deploy("vZUGToken", vzug_abi, vzug_bin, [10000000000000 * 10**18])

# Step 2: Deploy Native Staking V4 (Rate: 0.1 ZUG/sec = 1e17)
native_abi, native_bin = compile_contract("ZugNativeStakingV4.sol", "ZugNativeStakingV4")
native_addr = deploy("ZugNativeStakingV4", native_abi, native_bin, [100000000000000000])

# Step 3: Deploy Token Staking V4 (Uses new vZUG, Rate: 0.1 vZUG/sec)
token_abi, token_bin = compile_contract("ZugTokenStakingV4.sol", "ZugTokenStakingV4")
token_addr = deploy("ZugTokenStakingV4", token_abi, token_bin, [vzug_addr, 100000000000000000])

# 5. SAVE ARTIFACTS
data = {
    "vZUG": {
        "address": vzug_addr,
        "abi": vzug_abi
    },
    "native_v4": {
        "address": native_addr,
        "abi": native_abi
    },
    "token_v4": {
        "address": token_addr,
        "abi": token_abi
    }
}

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "staking_v4_deploy_info.json")
with open(output_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"\nDeployment Complete! Info saved to {output_path}")
