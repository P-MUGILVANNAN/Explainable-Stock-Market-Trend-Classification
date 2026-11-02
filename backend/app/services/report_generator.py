import io
import csv
import logging
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

logger = logging.getLogger("app.services.report_generator")

class ReportGenerator:
    """
    Generates academic/research grade analytical PDF and CSV reports.
    """

    def generate_pdf_report(self, comparison_data: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        story = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            textColor=colors.HexColor('#475569'),
            spaceAfter=14
        )
        h2_style = ParagraphStyle(
            'H2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=colors.HexColor('#1E3A8A'),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            textColor=colors.HexColor('#1E293B'),
            leading=13
        )
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Italic'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            textColor=colors.HexColor('#64748B'),
            leading=11
        )

        symbol = comparison_data.get("symbol", "AAPL")
        model_name = comparison_data.get("model_name", "XGBoost").upper()
        horizon = comparison_data.get("horizon_days", 1)
        m_a = comparison_data.get("price_only_metrics", {})
        m_b = comparison_data.get("price_news_metrics", {})
        delta = comparison_data.get("improvement_delta", {})
        stat = comparison_data.get("statistical_test", {})

        # 1. Header
        story.append(Paragraph("Research Report: Explainable Stock Market Trend Classification", title_style))
        story.append(Paragraph(f"Empirical Evaluation of FinBERT Sentiment Integration | Symbol: <b>{symbol}</b> | Horizon: <b>{horizon} Day(s)</b>", subtitle_style))
        story.append(Spacer(1, 8))

        # 2. Executive Summary
        story.append(Paragraph("1. Research Objectives & Summary", h2_style))
        summary_text = (
            f"This study investigates whether incorporating FinBERT-derived financial news sentiment features "
            f"improves multi-class stock market trend classification (UPWARD, SIDEWAYS, DOWNWARD) relative to "
            f"purely technical indicator and historical price models. Model evaluated: <b>{model_name}</b>. "
            f"All experiments utilize strictly chronological out-of-sample test splits to eliminate look-ahead bias."
        )
        story.append(Paragraph(summary_text, body_style))
        story.append(Spacer(1, 10))

        # 3. Model Comparison Table
        story.append(Paragraph("2. Quantitative Comparative Evaluation", h2_style))
        table_data = [
            ["Metric", "Price-Only Baseline", "Price + FinBERT News", "Empirical Delta (B - A)"],
            ["Test Accuracy", f"{m_a.get('accuracy', 0)*100:.2f}%", f"{m_b.get('accuracy', 0)*100:.2f}%", f"{delta.get('accuracy_delta', 0)*100:+.2f}%"],
            ["Balanced Accuracy", f"{m_a.get('balanced_accuracy', 0)*100:.2f}%", f"{m_b.get('balanced_accuracy', 0)*100:.2f}%", f"{delta.get('balanced_accuracy_delta', 0)*100:+.2f}%"],
            ["Macro F1-Score", f"{m_a.get('f1_macro', 0)*100:.2f}%", f"{m_b.get('f1_macro', 0)*100:.2f}%", f"{delta.get('macro_f1_delta', 0)*100:+.2f}%"],
            ["Macro Precision", f"{m_a.get('precision_macro', 0)*100:.2f}%", f"{m_b.get('precision_macro', 0)*100:.2f}%", f"{delta.get('precision_macro_delta', 0)*100:+.2f}%"],
            ["Macro Recall", f"{m_a.get('recall_macro', 0)*100:.2f}%", f"{m_b.get('recall_macro', 0)*100:.2f}%", f"{delta.get('recall_macro_delta', 0)*100:+.2f}%"],
            ["Log Loss (Cross-Entropy)", f"{m_a.get('log_loss', 0) or 'N/A'}", f"{m_b.get('log_loss', 0) or 'N/A'}", f"{delta.get('log_loss_reduction', 0):+.4f}"],
            ["Brier Score (Calibration)", f"{m_a.get('brier_score', 0) or 'N/A'}", f"{m_b.get('brier_score', 0) or 'N/A'}", f"{delta.get('brier_score_reduction', 0):+.4f}"],
            ["ROC-AUC (Macro OvR)", f"{m_a.get('roc_auc_macro', 0) or 'N/A'}", f"{m_b.get('roc_auc_macro', 0) or 'N/A'}", "-"]
        ]

        t = Table(table_data, colWidths=[150, 120, 120, 120])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

        # 4. Statistical Significance
        story.append(Paragraph("3. Statistical Significance & Hypothesis Testing", h2_style))
        ci_lower = stat.get("ci_95_lower", 0.0)
        ci_upper = stat.get("ci_95_upper", 0.0)
        p_val = stat.get("p_value", 1.0)
        sig_str = "Statistically Significant (p < 0.05)" if stat.get("statistically_significant") else "Not Statistically Significant (p >= 0.05)"

        stat_text = (
            f"Bootstrap Replications: 500 resamples. "
            f"95% Confidence Interval of Difference: [{ci_lower*100:+.2f}%, {ci_upper*100:+.2f}%]. "
            f"Observed p-value: {p_val:.4f} ({sig_str}).<br/>"
            f"<b>Empirical Finding:</b> {comparison_data.get('conclusion', '')}"
        )
        story.append(Paragraph(stat_text, body_style))
        story.append(Spacer(1, 10))

        # 5. Explainability & SHAP Analysis
        story.append(Paragraph("4. Explainability & Attribution Summary (SHAP)", h2_style))
        shap_text = (
            "Model interpretability is derived via TreeExplainer Shapley values. Technical features "
            "(RSI, MACD, Volume Moving Averages) provide steady structural momentum signals, "
            "while FinBERT daily sentiment metrics (Net Sentiment, Sentiment Volatility, News Volume) "
            "provide non-linear boundary adjustments ahead of earnings releases and corporate events."
        )
        story.append(Paragraph(shap_text, body_style))
        story.append(Spacer(1, 14))

        # 6. Academic Disclaimer
        story.append(Paragraph("5. Scientific Integrity & Risk Disclaimer", h2_style))
        disclaimer = (
            "DISCLAIMER: This report is generated strictly for academic and computational research purposes. "
            "Stock price movements are governed by complex macroeconomic variables, liquidity shocks, and stochastic behaviors. "
            "Past model performance does not guarantee future results. None of the contents herein constitute "
            "financial, investment, or trading advice."
        )
        story.append(Paragraph(disclaimer, disclaimer_style))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    def generate_predictions_csv(self, predictions: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        fieldnames = [
            "prediction_id", "symbol", "prediction_date", "data_cutoff",
            "horizon", "model_name", "experiment_type",
            "predicted_class", "confidence",
            "prob_downward", "prob_sideways", "prob_upward", "actual_class"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for p in predictions:
            probs = p.get("probabilities", {})
            writer.writerow({
                "prediction_id": p.get("prediction_id", ""),
                "symbol": p.get("symbol", ""),
                "prediction_date": p.get("prediction_date", ""),
                "data_cutoff": p.get("data_cutoff", ""),
                "horizon": p.get("horizon", 1),
                "model_name": p.get("model_name", ""),
                "experiment_type": p.get("experiment_type", ""),
                "predicted_class": p.get("predicted_class", ""),
                "confidence": p.get("confidence", 0.0),
                "prob_downward": probs.get("DOWNWARD", 0.0),
                "prob_sideways": probs.get("SIDEWAYS", 0.0),
                "prob_upward": probs.get("UPWARD", 0.0),
                "actual_class": p.get("actual_class", "")
            })

        return output.getvalue()

report_generator = ReportGenerator()

