const reportService = require('../services/reportService');

const reportController = {
    generateReport: async (req, res, next) => {
        try {
            const report = await reportService.generateReport(req.query);
            
            res.setHeader('Content-Type', report.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
            
            return res.send(report.data);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = reportController;
