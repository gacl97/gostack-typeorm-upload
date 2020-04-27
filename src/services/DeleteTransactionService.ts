// import AppError from '../errors/AppError';

import { getCustomRepository } from 'typeorm';
import TransactionRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface RequestDTO {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: RequestDTO): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionRepository);

    const transactionExists = await transactionsRepository.find({
      where: { id },
    });

    if (!transactionExists) {
      throw new AppError('Transaction do not exists.', 400);
    }

    await transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
