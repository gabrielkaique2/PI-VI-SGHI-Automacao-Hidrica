class LeituraMapper {
  static toDTO(dbLeitura = {}) {
    return {
      deviceID: dbLeitura.device_id != null ? String(dbLeitura.device_id) : null,
      propriedade: dbLeitura.propriedade != null ? String(dbLeitura.propriedade) : null,
      valor: dbLeitura.valor != null ? Number(dbLeitura.valor) : null,
      statusBomba: dbLeitura.statusBomba != null ? String(dbLeitura.statusBomba) : null,
      timestamp: dbLeitura.timestamp != null ? String(dbLeitura.timestamp) : null
    };
  }

  static transformValor(rawValor) {
    if (rawValor == null || Number.isNaN(Number(rawValor))) return null;
    return this.getPercentage(Number(rawValor));
  }

  static getPercentage(value) {
    return parseInt(((value - 0) / (410 - 0)) * 100);
  }
}

module.exports = LeituraMapper;