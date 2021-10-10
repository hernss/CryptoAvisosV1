const { expect } = require("chai");

describe("CryptoAvisosV1", function () {
    let productIdDai = 256;
    let productIdEth = 266;
    let fee = 15;

    //Seller: this.accounts[1]
    //Buyer: this.accounts[2]

    before(async function () {
        this.accounts = await ethers.getSigners();

        //Deploy CAV1
        this.CryptoAvisosV1 = await ethers.getContractFactory("CryptoAvisosV1");
        this.cryptoAvisosV1 = await this.CryptoAvisosV1.deploy(ethers.utils.parseUnits(String(fee)));
        await this.cryptoAvisosV1.deployed();

        //Deploy Example DAI
        this.DAI = await ethers.getContractFactory("DAI");
        this.dai = await this.DAI.deploy(ethers.utils.parseUnits('10000000', "ether"));
        await this.dai.deployed();

        //Transfer DAI to account 2
        await this.dai.transfer(this.accounts[2].address, ethers.utils.parseUnits('10000', "ether"));
    });

    it(`Fee should be equal to...`, async function () {
        await expect(this.cryptoAvisosV1.implementFee()).to.be.revertedWith('not prepared');
        await this.cryptoAvisosV1.prepareFee(ethers.utils.parseUnits(String(fee)));
        await expect(this.cryptoAvisosV1.implementFee()).to.be.revertedWith('not unlocked yet');
        await network.provider.send("evm_increaseTime", [604800]); //1 week
        await this.cryptoAvisosV1.implementFee();
        expect(Number(ethers.utils.formatUnits(await this.cryptoAvisosV1.fee()))).to.equal(fee);
    });

    it("Should submit a product payable with DAI, succesfully...", async function () {
        //Submit product
        let productId = productIdDai;
        let productPrice = '180';
        let productSeller = this.accounts[1].address;
        let productToken = this.dai.address;
        let daiDecimals = await this.dai.decimals();
        const submitProductTx = await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken);
        
        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);
    });

    it("Should submit a product payable with ETH, succesfully...", async function () {
        //Submit product
        let productId = productIdEth;
        let productPrice = '1.5';
        let productSeller = this.accounts[1].address;
        let productToken = ethers.constants.AddressZero;
        const submitProductTx = await this.cryptoAvisosV1.submitProduct(productId, productSeller, ethers.utils.parseUnits(productPrice), productToken);

        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);
    });

    it("Should update a product, successfully...", async function () {
        //Update product
        let productId = productIdDai;
        let productPrice = '200';
        let productSeller = this.accounts[1].address;
        let productToken = this.dai.address;
        let daiDecimals = await this.dai.decimals();
        const updateProductTx = await this.cryptoAvisosV1.updateProduct(productId, productSeller, ethers.utils.parseUnits(productPrice, daiDecimals), productToken);

        //View product
        let productMapping = await this.cryptoAvisosV1.productMapping(productId);
        expect(Number(ethers.utils.formatUnits(productMapping.price))).equal(Number(productPrice));
        expect(productMapping.seller).equal(productSeller);
        expect(productMapping.token).equal(productToken);
    });

    it("Should pay a product with DAI, succesfully...", async function () {
        //Approve DAI
        let daiDecimals = await this.dai.decimals();
        const approveTx = await this.dai.connect(this.accounts[2]).approve(this.cryptoAvisosV1.address, ethers.utils.parseUnits('10000', daiDecimals));

        //DAI amount before
        let daiBalanceBuyerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.accounts[2].address));
        let daiBalanceContractBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        //Pay product
        const payProductTx = await this.cryptoAvisosV1.connect(this.accounts[2]).payProduct(productIdDai);

        //DAI amount after
        let daiBalanceBuyerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.accounts[2].address));
        let daiBalanceContractAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productIdDai);
        expect(Number(daiBalanceBuyerAfter)).equal(Number(daiBalanceBuyerBefore) - Number(ethers.utils.formatUnits(product.price)));
        expect(Number(daiBalanceContractAfter)).equal(Number(daiBalanceContractBefore) + Number(ethers.utils.formatUnits(product.price)));
    });

    it("Should pay a product with ETH, succesfully...", async function () {
        //ETH amount before
        let ethBalanceBuyerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.accounts[2].address));
        let ethBalanceContractBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productIdEth);

        //Pay product
        const payProductTx = await this.cryptoAvisosV1.connect(this.accounts[2]).payProduct(productIdEth, { value: String(product.price) });

        //ETH amount after
        let ethBalanceBuyerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.accounts[2].address));
        let ethBalanceContractAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        // expect(Number(ethBalanceBuyerAfter)).equal(Number(ethBalanceBuyerBefore) - Number(ethers.utils.formatUnits(product.price)) + Number(ethers.utils.formatUnits(txCost)));
        expect(Number(ethBalanceContractAfter)).equal(Number(ethBalanceContractBefore) + Number(ethers.utils.formatUnits(product.price)));
    });

    it("Should release DAI from product pay...", async function () {
        let daiBalanceSellerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.accounts[1].address));
        let daiBalanceContractBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productIdDai);
        const releasePayTx = await this.cryptoAvisosV1.releasePay(productIdDai);

        let daiBalanceSellerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.accounts[1].address));
        let daiBalanceContractAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.cryptoAvisosV1.address));

        expect(Number(daiBalanceSellerAfter)).equal(Number(daiBalanceSellerBefore) + Number(ethers.utils.formatUnits(product.price)) - (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
        expect(Number(daiBalanceContractAfter)).equal(Number(daiBalanceContractBefore) - Number(ethers.utils.formatUnits(product.price)) + (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
    });

    it("Should release ETH from product pay...", async function () {
        let ethBalanceSellerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.accounts[1].address));
        let ethBalanceContractBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        let product = await this.cryptoAvisosV1.productMapping(productIdEth);
        const releasePayTx = await this.cryptoAvisosV1.releasePay(productIdEth);

        let ethBalanceSellerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.accounts[1].address));
        let ethBalanceContractAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.cryptoAvisosV1.address));

        expect(Number(ethBalanceSellerAfter)).equal(Number(ethBalanceSellerBefore) + Number(ethers.utils.formatUnits(product.price)) - (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
        expect(Number(ethBalanceContractAfter)).equal(Number(ethBalanceContractBefore) - Number(ethers.utils.formatUnits(product.price)) + (fee * Number(ethers.utils.formatUnits(product.price)) / 100));
    });

    it("Should claim fees in DAI, succesfully...", async function () {
        let balanceToClaim = "1";
        let daiBalanceOwnerBefore = ethers.utils.formatUnits(await this.dai.balanceOf(this.accounts[0].address));
        await this.cryptoAvisosV1.connect(this.accounts[0]).claimFee(this.dai.address, ethers.utils.parseUnits(balanceToClaim));
        let daiBalanceOwnerAfter = ethers.utils.formatUnits(await this.dai.balanceOf(this.accounts[0].address));
        expect(Number(daiBalanceOwnerAfter)).closeTo(Number(daiBalanceOwnerBefore) + Number(balanceToClaim), 0.01);
    });

    it("Should claim fees in ETH, succesfully...", async function () {
        let balanceToClaim = "0.05";
        let ethBalanceOwnerBefore = ethers.utils.formatUnits(await ethers.provider.getBalance(this.accounts[0].address));
        await this.cryptoAvisosV1.connect(this.accounts[0]).claimFee(ethers.constants.AddressZero, ethers.utils.parseUnits(balanceToClaim));
        let ethBalanceOwnerAfter = ethers.utils.formatUnits(await ethers.provider.getBalance(this.accounts[0].address));
        expect(Number(ethBalanceOwnerAfter)).closeTo(Number(ethBalanceOwnerBefore) + Number(balanceToClaim), 0.01);
    });

    it("Should getProductsIds, successfully...", async function () {
        let productsIds = await this.cryptoAvisosV1.getProductsIds();
        expect(productsIds.length).greaterThan(0);
    });
});