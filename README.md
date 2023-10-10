# ERC20 Tax Uniswap

This repository contains an ERC-20 contract that has been modified to include transfer tax (buy & sell) for use with uniswap V2.

## Features
- Contract owner can activate buy / sell tax
- Contract owner can whitelist certain addresses to be excluded from tax
- Contract owner can set tax amount whenever
- Swaps using uniswap router will be taxed both in 'buying' and 'selling'

## Loopholes
- If swaps are done without using the router, but directly with the pair contract, the taxes do not apply