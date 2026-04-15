import React, { useState } from 'react';
import { 
  HelpCircle, 
  Upload, 
  CheckCircle, 
  Eye, 
  Brain, 
  FileCode, 
  Database, 
  Settings,
  Download,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export function HelpPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      question: 'Какие форматы моделей поддерживаются?',
      answer: 'Система поддерживает YOLO (v5, v8), PyTorch (Faster R-CNN, любые модели, совместимые с torch.load), ONNX и TensorFlow (Keras H5). Для PyTorch рекомендуется сохранять полную модель, а не только state_dict.'
    },
    {
      question: 'Как проверить, что моя модель подходит для инкрементального обучения?',
      answer: 'Валидатор проверит наличие методов train, save, add_new_classes и supports_incremental_learning. Для стандартных моделей (YOLO, Faster R-CNN) адаптеры уже реализованы. Если вы используете кастомную модель, оберните её в адаптер, реализующий интерфейс BaseDetectionModel.'
    },
    {
      question: 'Можно ли дообучить модель на своих данных без разметки?',
      answer: 'Нет, для обучения необходимы размеченные bounding boxes. Вы можете создать разметку через интерфейс аннотаций в системе или загрузить готовые YOLO-формат (txt) файлы вместе с изображениями.'
    },
      {
      question: 'Что делать, если валидация выдаёт ошибку "неверный формат выхода"?',
      answer: 'Убедитесь, что модель возвращает список словарей с ключами boxes, labels, scores (для PyTorch) или объект YOLO с атрибутами boxes. Для кастомных моделей используйте адаптер, который приводит вывод к единому формату.'
    },
    {
      question: 'Как увеличить скорость инференса?',
      answer: 'Используйте ONNX или TensorRT экспорт. В системе для PyTorch моделей инференс выполняется на CPU; вы можете изменить device на GPU, установив переменную окружения CUDA_VISIBLE_DEVICES.'
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleDownloadExampleModel = () => {
    // Генерируем и скачиваем случайную модель (PyTorch Faster R-CNN)
    fetch('/api/example-model', { method: 'GET' })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'example_model.pt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => console.error('Ошибка загрузки примера:', err));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <HelpCircle className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Справочный центр
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Всё, что нужно знать о работе с системой валидации и обучения моделей детекции
          </p>
        </div>

        {/* Быстрый старт */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
            Начало работы
          </h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-indigo-100 rounded-full p-2">
                <span className="text-indigo-700 font-bold">1</span>
              </div>
              <div className="ml-4">
                <p className="text-gray-700">Загрузите модель через форму <strong>/models</strong> (POST) указав путь к файлу и тип фреймворка.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-indigo-100 rounded-full p-2">
                <span className="text-indigo-700 font-bold">2</span>
              </div>
              <div className="ml-4">
                <p className="text-gray-700">Проверьте модель через эндпоинт <strong>/models/validate</strong> – валидатор проверит формат выхода и способность к обучению.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-indigo-100 rounded-full p-2">
                <span className="text-indigo-700 font-bold">3</span>
              </div>
              <div className="ml-4">
                <p className="text-gray-700">Выполните предсказание на изображениях (эндпоинт <strong>/predict</strong>) или запустите онлайн-обучение на размеченных данных.</p>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              💡 <span className="font-medium">Совет:</span> Для тестирования скачайте пример модели (случайные веса) – кнопка ниже.
            </p>
            <button
              onClick={handleDownloadExampleModel}
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать пример модели (.pt)
            </button>
          </div>
        </section>

        {/* Типы моделей */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Database className="h-6 w-6 text-blue-500 mr-2" />
            Поддерживаемые типы моделей
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 hover:shadow transition">
              <div className="font-semibold text-indigo-700">YOLO (v5, v8)</div>
              <p className="text-sm text-gray-600 mt-1">Файл .pt от Ultralytics. Выход: объект Results с атрибутами boxes. Поддержка обучения через data.yaml.</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow transition">
              <div className="font-semibold text-indigo-700">PyTorch</div>
              <p className="text-sm text-gray-600 mt-1">Полная модель (не state_dict). Должна возвращать список словарей с ключами 'boxes', 'labels', 'scores'.</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow transition">
              <div className="font-semibold text-indigo-700">ONNX</div>
              <p className="text-sm text-gray-600 mt-1">Файл .onnx. Инференс через onnxruntime. Ожидается один или несколько выходов.</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow transition">
              <div className="font-semibold text-indigo-700">TensorFlow</div>
              <p className="text-sm text-gray-600 mt-1">Модель Keras в формате .h5. Входной тензор (batch, height, width, 3).</p>
            </div>
          </div>
        </section>

        {/* Валидация, предсказание, обучение – три карточки */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <Upload className="h-8 w-8 text-indigo-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Валидация модели</h3>
            <p className="text-gray-600 mt-1 text-sm">Отправьте POST /validate с файлом модели и model_type. Валидатор проверит:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>Формат выхода (наличие boxes, scores, labels)</li>
              <li>Способность к обучению (наличие методов train, save)</li>
              <li>Поддержку инкрементального обучения</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <Eye className="h-8 w-8 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Предсказание</h3>
            <p className="text-gray-600 mt-1 text-sm">Используйте POST /predict с model_id и списком file_ids. Ответ содержит:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>Нормализованные координаты bbox (x, y, width, height)</li>
              <li>Метку класса и уверенность</li>
              <li>Время обработки</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <Brain className="h-8 w-8 text-purple-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Онлайн-обучение</h3>
            <p className="text-gray-600 mt-1 text-sm">POST /online-learning с task_id, model_id, гиперпараметрами. Процесс:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>Подготовка датасета из аннотаций задачи</li>
              <li>Расширение выходного слоя под новые классы (если нужно)</li>
              <li>Запуск дообучения в фоновом режиме</li>
            </ul>
          </div>
        </div>

        {/* FAQ секция с аккордеоном */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <HelpCircle className="h-6 w-6 text-yellow-500 mr-2" />
            Часто задаваемые вопросы
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b border-gray-200 last:border-0">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center py-4 text-left focus:outline-none"
                >
                  <span className="text-md font-medium text-gray-900">{faq.question}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="pb-4 text-gray-600 text-sm">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Контакты */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Mail className="h-6 w-6 text-red-500 mr-2" />
            Контакты поддержки
          </h2>
          <p className="text-gray-600">По всем вопросам обращайтесь:</p>
          <ul className="mt-2 space-y-1 text-gray-600">
            <li>📧 Email: <a href="abuskevicaleksej@gmail.com" className="text-indigo-600 hover:underline">abuskevicaleksej@gmail.com</a></li>
            <li>💬 Telegram: <a href="https://t.me/leable808" className="text-indigo-600 hover:underline">@leable808</a></li>
            <li>📄 Документация API: <a href="/api/docs" className="text-indigo-600 hover:underline">/api/docs</a> (Swagger UI)</li>
          </ul>
          <div className="mt-6 p-3 bg-gray-50 rounded-md text-sm text-gray-500">
            Версия системы: 2.0.0 — последнее обновление: апрель 2026
          </div>
        </section>
      </div>
    </div>
  );
};

export default HelpPage;