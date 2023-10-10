// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract ERC20TaxUniswap is ERC20, Ownable {
    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2PairAddress;
    mapping(address => bool) isExcludedFromTax; // addresses excluded from tax
    bool public isTransferTaxActive;

    uint16 public buyTaxPercentage;
    uint16 public sellTaxPercentage;
    uint16 public maxPerTxn; // max percentage of tokens transferred per transaction in basis points
    uint16 public maxPerWallet; // max percentage of tokens a wallet can hold per transaction in basis points

    constructor(
        address _uniswapRouterAddress,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        uniswapV2Router = IUniswapV2Router02(_uniswapRouterAddress);
        IUniswapV2Factory uniswapV2Factory = IUniswapV2Factory(
            uniswapV2Router.factory()
        );
        uniswapV2PairAddress = uniswapV2Factory.createPair(
            address(this),
            uniswapV2Router.WETH()
        );
        isExcludedFromTax[msg.sender] = true;
    }

    function excludeFromTax(
        address _wallet,
        bool _isExcluded
    ) public onlyOwner {
        isExcludedFromTax[_wallet] = _isExcluded;
    }

    /// @notice Sets whether to tax transactions
    function setIsTransferTaxActive(bool _isActive) public onlyOwner {
        isTransferTaxActive = _isActive;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        // tax amount
        bool isSelling = address(uniswapV2Router) == from &&
            uniswapV2PairAddress == to;
        bool isBuying = uniswapV2PairAddress == msg.sender &&
            from == uniswapV2PairAddress;
        uint256 taxAmount = calculateTaxAmount(from, to, amount, isSelling);

        if (taxAmount == 0 || !isTransferTaxActive) {
            super._transfer(from, to, amount);
        } else if (isSelling) {
            super._transfer(from, to, amount - taxAmount);
            super._transfer(from, owner(), taxAmount);
        } else if (isBuying) {
            super._transfer(from, to, amount);
            super._transfer(to, owner(), taxAmount);
        }
    }

    function calculateTaxAmount(
        address from,
        address to,
        uint256 amount,
        bool isSelling
    ) internal view returns (uint256) {
        if (isExcludedFromTax[from] || isExcludedFromTax[to]) {
            return 0;
        }
        if (isSelling) {
            return (amount * sellTaxPercentage) / 1000;
        } else {
            return (amount * buyTaxPercentage) / 1000;
        }
    }

    /// @notice unit is in basis points so for example to set a 10% tax, use 100 as the value
    function setTaxes(uint16 _buyTax, uint16 _sellTax) public onlyOwner {
        buyTaxPercentage = _buyTax;
        sellTaxPercentage = _sellTax;
    }
}
