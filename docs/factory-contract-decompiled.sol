// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Factory Contract (Decompiled)
 * @notice Ce contrat a été décompilé à partir du bytecode fourni
 * @dev Utilise le pattern ERC-1167 (Minimal Proxy) pour créer des marchés
 */
contract FactoryContract {
    
    // Adresse de l'implémentation du contrat de marché
    address public constant IMPLEMENTATION = 0x99ed2e56eb69df6fdc89b535c06b769a847ddcdd;
    
    // Adresse utilisée dans la logique de création (possiblement un oracle ou configurateur)
    address private constant SECONDARY_ADDRESS = 0xa0a01effc78ba56c26b95e5e731b8cde023b39bc;
    
    /**
     * @notice Événement émis lors de la création d'un nouveau marché
     * @param marketAddress L'adresse du marché créé
     */
    event MarketCreated(address indexed marketAddress);
    
    /**
     * @notice Retourne l'adresse de l'implémentation utilisée pour les proxies
     * @return L'adresse du contrat d'implémentation
     */
    function IMPLEMENTATION() external pure returns (address) {
        return IMPLEMENTATION;
    }
    
    /**
     * @notice Crée un nouveau marché en utilisant le pattern proxy
     * @param _param1 Premier paramètre (possiblement l'ID du marché ou timestamp)
     * @param _param2 Adresse (possiblement token ou créateur)
     * @param _param3 Troisième paramètre (possiblement montant ou prix)
     * @param _param4 Quatrième paramètre (possiblement durée ou deadline)
     * @param _param5 Cinquième paramètre (possiblement frais ou ratio)
     * @param _param6 Sixième paramètre (possiblement configuration)
     * @return L'adresse du marché créé
     */
    function createMarket(
        uint256 _param1,
        address _param2,
        uint256 _param3,
        uint256 _param4,
        uint256 _param5,
        uint256 _param6
    ) external returns (address) {
        // Calcule l'adresse du nouveau marché en utilisant CREATE2
        address marketAddress = _computeMarketAddress(_param1);
        
        // Initialise le marché avec les paramètres fournis
        // Appelle la fonction initialize (0x83a5041c) sur le nouveau contrat
        (bool success,) = marketAddress.call(
            abi.encodeWithSelector(
                0x83a5041c, // initialize function selector
                msg.sender,
                _param2,
                _param3,
                _param4,
                _param5,
                _param6,
                SECONDARY_ADDRESS
            )
        );
        require(success, "Market initialization failed");
        
        // Émet l'événement de création
        emit MarketCreated(marketAddress);
        
        return marketAddress;
    }
    
    /**
     * @notice Calcule l'adresse d'un marché avant sa création
     * @param _salt Le salt utilisé pour CREATE2
     * @return L'adresse prédictible du marché
     */
    function computeMarketAddress(uint256 _salt) external view returns (address) {
        return _computeMarketAddress(_salt);
    }
    
    /**
     * @dev Fonction interne pour calculer l'adresse du marché
     * @param _salt Le salt pour CREATE2
     * @return L'adresse calculée
     */
    function _computeMarketAddress(uint256 _salt) internal view returns (address) {
        // Bytecode du proxy ERC-1167
        bytes memory bytecode = abi.encodePacked(
            hex"3d602d80600a3d3981f3363d3d373d3d3d363d73",
            IMPLEMENTATION,
            hex"5af43d82803e903d91602b57fd5bf3"
        );
        
        // Calcule l'adresse avec CREATE2
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                _salt,
                keccak256(bytecode)
            )
        );
        
        return address(uint160(uint256(hash)));
    }
    
    /**
     * @dev Crée un nouveau contrat proxy en utilisant CREATE2
     * @param _salt Le salt pour la création déterministe
     * @return L'adresse du contrat créé
     */
    function _createProxy(uint256 _salt) internal returns (address) {
        bytes memory bytecode = abi.encodePacked(
            hex"3d602d80600a3d3981f3363d3d373d3d3d363d73",
            IMPLEMENTATION,
            hex"5af43d82803e903d91602b57fd5bf3"
        );
        
        address proxy;
        assembly {
            proxy := create2(0, add(bytecode, 0x20), mload(bytecode), _salt)
        }
        
        require(proxy != address(0), "ERC1167: create2 failed");
        return proxy;
    }
}